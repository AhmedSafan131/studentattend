<?php

namespace App\Services\Admin;

use App\Models\AcademicTerm;
use App\Models\CatalogSubject;
use App\Models\CourseAssignment;
use App\Models\User;
use App\Support\Permissions;
use App\Support\Role;
use App\Support\UniversityCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UserManagementService
{
    /** @var array<string, \Illuminate\Support\Collection> */
    private array $catalogSubjectsByFacultyAndTerm = [];

    public function create(array $data, ?string $termCode = null): User
    {
        return DB::transaction(fn () => $this->persist(new User, $data, true, $termCode ?: AcademicTerm::getActiveTermCode()));
    }

    public function update(User $user, array $data, ?string $termCode = null): User
    {
        return DB::transaction(fn () => $this->persist($user, $data, false, $termCode ?: AcademicTerm::getActiveTermCode()));
    }

    /**
     * Bulk import endpoints already own one transaction for the complete file.
     * Avoid a nested transaction and the two relationship reloads for every row.
     */
    public function createForImport(array $data, string $termCode): User
    {
        return $this->persist(new User, $data, true, $termCode, false);
    }

    public function updateForImport(User $user, array $data, string $termCode): User
    {
        return $this->persist($user, $data, false, $termCode, false);
    }

    private function persist(User $user, array $data, bool $isCreating, string $termCode, bool $reloadRelations = true): User
    {
        $role = Role::normalize($data['userRole'] ?? $data['role'] ?? $user->role);
        $isSystem = (bool) ($data['isSystem'] ?? $user->is_system ?? false);
        $fullName = trim((string) ($data['fullName'] ?? $data['full_name'] ?? $data['name'] ?? $user->full_name ?? ''));
        $user->fill([
            'id' => $user->exists ? $user->id : ($data['id'] ?? "{$role}-".Str::uuid()),
            'email' => trim($data['email']),
            'name' => $data['name'] ?? $fullName,
            'full_name' => $fullName,
            'role' => $role,
            'specialty' => $data['specialty'] ?? '',
            'avatar' => $data['avatar'] ?? strtoupper(substr($fullName ?: $role, 0, 2)),
            'is_system' => $isSystem,
            'permissions' => $data['permissions'] ?? Permissions::defaultsForRole($role, $isSystem),
            'allowed_colleges' => collect($data['allowedColleges'] ?? [])
                ->map(fn ($college) => UniversityCatalog::canonicalCollegeName($college))
                ->filter()
                ->values()
                ->all(),
            'restrict_flexible_attendance_to_assignments' => (bool) (
                $data['restrictFlexibleAttendanceToAssignments']
                    ?? $user->restrict_flexible_attendance_to_assignments
                    ?? false
            ),
            'require_flexible_student_registration' => (bool) (
                $data['requireFlexibleStudentRegistration']
                    ?? $user->require_flexible_student_registration
                    ?? false
            ),
            'student_id' => $data['studentId'] ?? '',
            'university_id' => $data['universityId'] ?? ($data['studentId'] ?? ''),
            'national_id' => $data['nationalId'] ?? '',
            'college' => UniversityCatalog::canonicalCollegeName($data['college'] ?? '') ?? '',
        ]);

        if ($isCreating || filled($data['password'] ?? null)) {
            $user->password = $data['password'];
        }

        $user->save();

        $this->syncCourses($user, $data['courses'] ?? [], $termCode);
        $this->syncRegistrations($user, $data['registrations'] ?? [], $termCode);

        if (! $reloadRelations) {
            return $user;
        }

        return $user->fresh([
            'courses' => fn ($query) => $query->where('term_code', $termCode),
            'registrations' => fn ($query) => $query->where('term_code', $termCode),
        ]);
    }

    private function syncCourses(User $user, array $courses, string $termCode): void
    {
        $user->courses()->where('term_code', $termCode)->delete();

        foreach ($courses as $course) {
            if (empty($course['id']) || empty($course['name'])) {
                continue;
            }

            $user->courses()->create([
                'uid' => $this->uniqueCourseUid($course['uid'] ?? "{$course['id']}-".Str::uuid(), $termCode),
                'course_id' => $course['id'],
                'name' => $course['name'],
                'faculty' => $course['faculty'] ?? null,
                'college' => $course['college'] ?? null,
                'type' => $course['type'] ?? null,
                'term_code' => $termCode,
            ]);
        }
    }

    private function syncRegistrations(User $user, array $registrations, string $termCode): void
    {
        if ($user->role === 'student') {
            $registrations = $this->resolveCatalogRegistrations($user, $registrations, $termCode);
        }

        $user->registrations()->where('term_code', $termCode)->delete();

        foreach ($registrations as $registration) {
            if (empty($registration['subjectCode'])) {
                continue;
            }

            $user->registrations()->create([
                'subject_code' => $this->normalizeCode($registration['subjectCode']),
                'subject_name' => $registration['subjectName'] ?? null,
                'group' => $registration['group'] ?? null,
                'type' => $registration['type'] ?? null,
                'term_code' => $termCode,
            ]);
        }
    }

    private function resolveCatalogRegistrations(User $user, array $registrations, string $termCode): array
    {
        if ($registrations === []) {
            return [];
        }

        $facultyId = UniversityCatalog::canonicalFacultyId($user->college);

        if (! $facultyId) {
            throw ValidationException::withMessages([
                'college' => ['The student college could not be matched to a faculty in the subject catalog.'],
            ]);
        }

        $cacheKey = $termCode.'|'.$facultyId;
        $catalogSubjects = $this->catalogSubjectsByFacultyAndTerm[$cacheKey] ??= CatalogSubject::query()
            ->where('faculty_id', $facultyId)
            ->where(function ($query) use ($termCode) {
                $query->where('term_code', $termCode)->orWhereNull('term_code');
            })
            ->orderByRaw('CASE WHEN term_code = ? THEN 0 ELSE 1 END', [$termCode])
            ->get()
            ->unique(fn (CatalogSubject $subject) => $this->normalizeCode($subject->subject_code))
            ->keyBy(fn (CatalogSubject $subject) => $this->normalizeCode($subject->subject_code));

        $errors = [];
        $resolved = [];

        foreach ($registrations as $index => $registration) {
            $subjectCode = $this->normalizeCode($registration['subjectCode'] ?? null);
            if ($subjectCode === '') {
                continue;
            }

            $catalogSubject = $catalogSubjects->get($subjectCode);
            if (! $catalogSubject) {
                $errors["registrations.$index.subjectCode"] = [
                    "Subject code {$subjectCode} is not registered in the selected faculty catalog for term {$termCode}.",
                ];
                continue;
            }

            $resolved[] = [
                ...$registration,
                'subjectCode' => $subjectCode,
                'subjectName' => $catalogSubject->subject_name,
            ];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $resolved;
    }

    private function uniqueCourseUid(string $uid, string $termCode): string
    {
        $candidate = trim($uid) ?: (string) Str::uuid();

        if (! CourseAssignment::query()->whereKey($candidate)->exists()) {
            return $candidate;
        }

        $termSuffix = Str::slug($termCode) ?: 'term';
        $candidate = "{$candidate}-{$termSuffix}";
        $counter = 2;

        while (CourseAssignment::query()->whereKey($candidate)->exists()) {
            $candidate = "{$uid}-{$termSuffix}-{$counter}";
            $counter++;
        }

        return $candidate;
    }

    private function normalizeCode(?string $value): string
    {
        return Str::upper(trim((string) $value));
    }

}
