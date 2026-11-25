<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Student\StoreStudentRequest;
use App\Http\Requests\Api\Student\UpdateStudentRequest;
use App\Models\AcademicTerm;
use App\Models\ApiToken;
use App\Models\CatalogSubject;
use App\Models\CourseAssignment;
use App\Models\StudentDeviceBinding;
use App\Models\StudentRegistration;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Admin\UserManagementService;
use App\Support\Permissions;
use App\Support\UniversityCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    private const IMPORT_VALIDATION_CHUNK_SIZE = 25;

    public function __construct(private readonly UserManagementService $users) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, Permissions::VIEW_STUDENTS);

        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: AcademicTerm::getActiveTermCode();

        $query = User::query()
            ->with([
                'registrations' => fn ($query) => $query->when($termCode, fn ($q) => $q->where('term_code', $termCode)),
            ])
            ->where('role', 'student');

        $this->applyCollegeAccessScope($query, $request->user());
        $allTotal = (clone $query)->count();
        $query->when($request->boolean('current_term_only'), fn ($builder) => $builder->whereHas(
                'registrations',
                fn ($registrations) => $registrations->when($termCode, fn ($q) => $q->where('term_code', $termCode)),
            ));
        $identifier = trim((string) $request->query('identifier', ''));
        if ($identifier !== '') {
            $query->where(function ($builder) use ($identifier) {
                $builder
                    ->where('student_id', $identifier)
                    ->orWhere('university_id', $identifier)
                    ->orWhere('national_id', $identifier)
                    ->orWhere('email', $identifier);
            });
        } else {
            $this->applyStudentSearch($query, trim((string) $request->query('search', '')), $termCode);
        }
        $query->orderBy('full_name')->orderBy('id');

        if ($request->has('page') || $request->has('perPage')) {
            $perPage = min(100, max(5, (int) $request->query('perPage', 12)));
            $paginator = $query->paginate($perPage);

            return response()->json([
                'students' => UserResource::collection($paginator->getCollection())->resolve($request),
                'pagination' => [
                    'currentPage' => $paginator->currentPage(),
                    'totalPages' => $paginator->lastPage(),
                    'perPage' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'allTotal' => $allTotal,
                ],
            ]);
        }

        $students = $query->get();

        return response()->json([
            'students' => UserResource::collection($students)->resolve($request),
        ]);
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $this->authorizePermission($request, Permissions::EDIT_STUDENTS);
        $validated = $request->validated();
        $this->authorizeCollege($request, $validated['college']);

        $data = $this->studentPayload($validated);
        $this->abortOnDuplicateStudent($data);

        $student = $this->users->create($data, AcademicTerm::getActiveTermCode());

        return response()->json((new UserResource($student))->resolve($request), 201);
    }

    public function import(Request $request): JsonResponse
    {
        $this->authorizePermission($request, Permissions::EDIT_STUDENTS);

        $data = $this->validateStudentImport($request);

        $termCode = AcademicTerm::getActiveTermCode();
        $studentIds = collect($data['students'])->pluck('studentId')->map(fn ($value) => trim((string) $value))->filter()->unique();
        $nationalIds = collect($data['students'])->pluck('nationalId')->map(fn ($value) => trim((string) $value))->filter()->unique();
        $existing = User::query()
            ->where('role', 'student')
            ->where(function ($query) use ($studentIds, $nationalIds) {
                $query->whereIn('student_id', $studentIds)
                    ->orWhereIn('university_id', $studentIds)
                    ->orWhereIn('national_id', $nationalIds);
            })
            ->get();

        $byStudentId = $existing->flatMap(fn (User $student) => collect([$student->student_id, $student->university_id])
            ->filter()->mapWithKeys(fn ($id) => [trim((string) $id) => $student]));
        $byNationalId = $existing->filter(fn (User $student) => filled($student->national_id))
            ->keyBy(fn (User $student) => trim((string) $student->national_id));
        $importEmails = collect($data['students'])
            ->map(fn (array $row) => Str::lower(trim((string) ($row['email'] ?? '')) ?: trim((string) ($row['nationalId'] ?? ''))))
            ->filter()
            ->unique()
            ->values();
        $usersByEmail = User::query()
            ->whereIn('email', $importEmails)
            ->get()
            ->keyBy(fn (User $user) => Str::lower(trim((string) $user->email)));

        $facultyIds = collect($data['students'])
            ->map(fn (array $row) => UniversityCatalog::canonicalFacultyId($row['college'] ?? null))
            ->filter()
            ->unique()
            ->values();
        $catalogByFacultyAndCode = CatalogSubject::query()
            ->whereIn('faculty_id', $facultyIds)
            ->where(fn ($query) => $query->where('term_code', $termCode)->orWhereNull('term_code'))
            ->orderByRaw('CASE WHEN term_code = ? THEN 0 ELSE 1 END', [$termCode])
            ->get()
            ->unique(fn (CatalogSubject $subject) => $subject->faculty_id.'|'.Str::upper(trim($subject->subject_code)))
            ->keyBy(fn (CatalogSubject $subject) => $subject->faculty_id.'|'.Str::upper(trim($subject->subject_code)));

        $now = now();
        $created = 0;
        $updated = 0;
        $userRows = [];
        $registrationRows = [];
        $importedStudentIds = [];
        $validationErrors = [];
        $claimedEmails = [];

        foreach ($data['students'] as $studentIndex => $row) {
            $this->authorizeCollege($request, $row['college']);
            $studentId = trim((string) $row['studentId']);
            $nationalId = trim((string) $row['nationalId']);
            $student = $byStudentId->get($studentId) ?: $byNationalId->get($nationalId);
            $payload = $this->studentPayload([
                ...$row,
                'email' => trim((string) ($row['email'] ?? '')) ?: $nationalId,
                'registrations' => $row['registrations'] ?? [],
                // A bulk sheet initializes new accounts only. Existing student
                // passwords are changed explicitly, not during enrollment sync.
                'password' => $student ? '' : ($row['password'] ?? ''),
            ], $student);
            $facultyId = UniversityCatalog::canonicalFacultyId($payload['college']);
            $resolvedRegistrations = [];
            $email = Str::lower(trim((string) $payload['email']));
            $studentIdentity = $student?->id ?: $studentId.'|'.$nationalId;
            $emailOwner = $usersByEmail->get($email);

            if ($emailOwner && $emailOwner->id !== $student?->id) {
                $validationErrors["students.{$studentIndex}.email"][] =
                    "Email {$payload['email']} already belongs to another user.";
            }

            if (isset($claimedEmails[$email]) && $claimedEmails[$email] !== $studentIdentity) {
                $validationErrors["students.{$studentIndex}.email"][] =
                    "Email {$payload['email']} is assigned to more than one student in the sheet.";
            } else {
                $claimedEmails[$email] = $studentIdentity;
            }

            foreach ($payload['registrations'] as $registrationIndex => $registration) {
                $subjectCode = Str::upper(trim((string) ($registration['subjectCode'] ?? '')));
                $catalogSubject = $facultyId
                    ? $catalogByFacultyAndCode->get($facultyId.'|'.$subjectCode)
                    : null;

                if (! $catalogSubject) {
                    $validationErrors["students.{$studentIndex}.registrations.{$registrationIndex}.subjectCode"] = [
                        "Subject code {$subjectCode} is not registered in the selected faculty catalog for term {$termCode}.",
                    ];
                    continue;
                }

                $resolvedRegistrations[] = [
                    'subject_code' => $subjectCode,
                    'subject_name' => $catalogSubject->subject_name,
                    'group' => $registration['group'] ?? null,
                    'type' => $registration['type'] ?? null,
                ];
            }

            $id = $student?->id ?: 'student-'.Str::uuid();
            $fullName = trim((string) ($payload['fullName'] ?? $payload['full_name'] ?? $payload['name'] ?? ''));
            $isCreating = ! $student;
            $passwordHash = $student?->password;

            if ($isCreating) {
                $plainPassword = trim((string) ($payload['password'] ?? '')) ?: ($studentId ?: '123456');
                $passwordHash = Hash::make($plainPassword);
                $created++;
            } else {
                $updated++;
            }

            $userRows[] = [
                'id' => $id,
                'email' => trim((string) $payload['email']),
                'name' => $payload['name'] ?? $fullName,
                'full_name' => $fullName,
                'password' => $passwordHash,
                'role' => 'student',
                'specialty' => '',
                'avatar' => $payload['avatar'] ?? strtoupper(substr($fullName ?: 'student', 0, 2)),
                'is_system' => (bool) ($student?->is_system ?? false),
                'permissions' => json_encode([], JSON_UNESCAPED_UNICODE),
                'allowed_colleges' => json_encode([], JSON_UNESCAPED_UNICODE),
                'restrict_flexible_attendance_to_assignments' => (bool) ($student?->restrict_flexible_attendance_to_assignments ?? false),
                'student_id' => $studentId,
                'university_id' => $payload['universityId'] ?? $studentId,
                'national_id' => $nationalId,
                'college' => $payload['college'],
                'activation_count' => (int) ($student?->activation_count ?? 0),
                'created_at' => $student?->created_at ?? $now,
                'updated_at' => $now,
            ];
            $importedStudentIds[] = $id;

            foreach ($resolvedRegistrations as $registration) {
                $registrationRows[] = [
                    'user_id' => $id,
                    ...$registration,
                    'term_code' => $termCode,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if ($validationErrors !== []) {
            throw ValidationException::withMessages($validationErrors);
        }

        DB::transaction(function () use ($userRows, $registrationRows, $importedStudentIds, $termCode) {
            foreach (array_chunk($userRows, 500) as $chunk) {
                User::query()->upsert($chunk, ['id'], [
                    'email', 'name', 'full_name', 'role', 'specialty', 'avatar', 'is_system',
                    'permissions', 'allowed_colleges', 'restrict_flexible_attendance_to_assignments',
                    'student_id', 'university_id', 'national_id', 'college', 'activation_count', 'updated_at',
                ]);
            }

            foreach (array_chunk(array_values(array_unique($importedStudentIds)), 500) as $studentIdChunk) {
                CourseAssignment::query()
                    ->whereIn('user_id', $studentIdChunk)
                    ->where('term_code', $termCode)
                    ->delete();
                StudentRegistration::query()
                    ->whereIn('user_id', $studentIdChunk)
                    ->where('term_code', $termCode)
                    ->delete();
            }

            foreach (array_chunk($registrationRows, 1000) as $chunk) {
                StudentRegistration::query()->insert($chunk);
            }
        });

        $summary = compact('created', 'updated');

        return response()->json(['summary' => $summary]);
    }

    private function validateStudentImport(Request $request): array
    {
        $students = Validator::make($request->all(), [
            'students' => ['required', 'array', 'min:1', 'max:5000'],
        ])->validate()['students'];

        $validatedStudents = [];
        $validationErrors = [];

        foreach (array_chunk($students, self::IMPORT_VALIDATION_CHUNK_SIZE, true) as $studentChunk) {
            $validator = Validator::make(['students' => $studentChunk], [
                'students' => ['required', 'array', 'min:1', 'max:5000'],
                'students.*.name' => ['required', 'string', 'max:255'],
                'students.*.fullName' => ['nullable', 'string', 'max:255'],
                'students.*.studentId' => ['required', 'string', 'max:255'],
                'students.*.universityId' => ['nullable', 'string', 'max:255'],
                'students.*.nationalId' => ['required', 'string', 'max:255'],
                'students.*.email' => ['nullable', 'string', 'max:255'],
                'students.*.password' => ['nullable', 'string', 'max:255'],
                'students.*.college' => ['required', 'string', 'max:255'],
                'students.*.registrations' => ['nullable', 'array'],
                'students.*.registrations.*.subjectCode' => ['required', 'string', 'max:50'],
                'students.*.registrations.*.subjectName' => ['nullable', 'string', 'max:255'],
                'students.*.registrations.*.group' => ['nullable', 'string', 'max:50'],
                'students.*.registrations.*.type' => ['nullable', 'string', 'max:50'],
            ]);

            if ($validator->fails()) {
                foreach ($validator->errors()->messages() as $field => $messages) {
                    $validationErrors[$field] = array_merge($validationErrors[$field] ?? [], $messages);
                }

                continue;
            }

            $validatedChunk = $validator->validated()['students'];

            foreach ($validatedChunk as $index => $student) {
                $validatedStudents[$index] = $student;
            }
        }

        if ($validationErrors !== []) {
            throw ValidationException::withMessages($validationErrors);
        }

        ksort($validatedStudents);

        return ['students' => array_values($validatedStudents)];
    }

    public function update(UpdateStudentRequest $request, string $id): JsonResponse
    {
        $this->authorizePermission($request, Permissions::EDIT_STUDENTS);

        $validated = $request->validated();
        $student = User::query()->with('courses', 'registrations')->where('role', 'student')->findOrFail($id);
        $this->authorizeCollege($request, $student->college);
        $this->authorizeCollege($request, $validated['college']);

        $data = $this->studentPayload($validated, $student);
        $this->abortOnDuplicateStudent($data, $student->id);

        $student = $this->users->update($student, $data, AcademicTerm::getActiveTermCode());

        return response()->json((new UserResource($student))->resolve($request));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->authorizePermission($request, Permissions::DELETE_STUDENTS);

        $student = User::query()->where('role', 'student')->findOrFail($id);
        $this->authorizeCollege($request, $student->college);
        $student->delete();

        return response()->json(null, 204);
    }

    public function locked(Request $request): JsonResponse
    {
        $this->authorizePermission($request, Permissions::VIEW_STUDENTS);

        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: AcademicTerm::getActiveTermCode();

        $query = StudentDeviceBinding::query()
            ->with(['user.registrations' => fn ($query) => $query->when($termCode, fn ($q) => $q->where('term_code', $termCode))])
            ->whereHas('user', function ($query) use ($request) {
                $query->where('role', 'student');
                $this->applyCollegeAccessScope($query, $request->user());
            })
            ->when($termCode, fn ($query) => $query->where('term_code', $termCode))
            ->when(trim((string) $request->query('facultyId', '')) !== '', function ($builder) use ($request) {
                $collegeNames = $this->collegeNamesForFaculty((string) $request->query('facultyId'));
                $builder->whereHas('user', fn ($users) => $users->whereIn('college', $collegeNames));
            })
            ->when(trim((string) $request->query('search', '')) !== '', function ($builder) use ($request) {
                $search = '%'.str_replace(['%', '_'], ['\\%', '\\_'], trim((string) $request->query('search'))).'%';
                $builder->where(function ($scope) use ($search) {
                    $scope->where('device_name', 'like', $search)
                        ->orWhere('platform', 'like', $search)
                        ->orWhere('browser', 'like', $search)
                        ->orWhereHas('user', fn ($users) => $users->where(function ($fields) use ($search) {
                            $fields->where('full_name', 'like', $search)
                                ->orWhere('student_id', 'like', $search)
                                ->orWhere('university_id', 'like', $search)
                                ->orWhere('national_id', 'like', $search)
                                ->orWhere('college', 'like', $search);
                        }));
                });
            })
            ->orderByDesc('updated_at');

        $mapBinding = fn (StudentDeviceBinding $binding) => [
                'id' => $binding->id,
                'deviceIdentifier' => $binding->device_identifier,
                'deviceName' => $binding->device_name,
                'platform' => $binding->platform,
                'browser' => $binding->browser,
                'lockedAt' => optional($binding->created_at)->toISOString(),
                'updatedAt' => optional($binding->updated_at)->toISOString(),
                'student' => (new UserResource($binding->user))->resolve($request),
            ];

        if ($request->has('page') || $request->has('perPage')) {
            $perPage = min(100, max(5, (int) $request->query('perPage', 8)));
            $paginator = $query->paginate($perPage);

            return response()->json([
                'students' => $paginator->getCollection()->map($mapBinding)->values(),
                'pagination' => [
                    'currentPage' => $paginator->currentPage(),
                    'totalPages' => $paginator->lastPage(),
                    'perPage' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ]);
        }

        $bindings = $query->get()->map($mapBinding)->values();

        return response()->json([
            'students' => $bindings,
        ]);
    }

    public function activateLocked(Request $request, string $id): JsonResponse
    {
        $this->authorizePermission($request, Permissions::EDIT_STUDENTS);

        return DB::transaction(function () use ($request, $id) {
            $binding = StudentDeviceBinding::query()
                ->with('user')
                ->whereHas('user', fn ($query) => $query->where('role', 'student'))
                ->lockForUpdate()
                ->findOrFail($id);

            $student = $binding->user;
            $this->authorizeCollege($request, $student?->college);

            $activated = StudentDeviceBinding::query()
                ->where('user_id', $student->id)
                ->delete();

            if ($activated > 0) {
                $student->increment('activation_count');
            }

            $revokedSessions = ApiToken::query()
                ->where('user_id', $student->id)
                ->delete();

            return response()->json([
                'activated' => $activated,
                'studentId' => $student->id,
                'activationCount' => (int) $student->fresh()->activation_count,
                'revokedSessions' => $revokedSessions,
            ]);
        });
    }

    public function activateAllLocked(Request $request): JsonResponse
    {
        $this->authorizePermission($request, Permissions::EDIT_STUDENTS);

        $data = $request->validate([
            'facultyId' => ['nullable', 'string', 'max:120'],
        ]);
        $facultyId = trim((string) ($data['facultyId'] ?? ''));
        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: AcademicTerm::getActiveTermCode();

        return DB::transaction(function () use ($request, $facultyId, $termCode) {
            $bindings = StudentDeviceBinding::query()
                ->with('user')
                ->whereHas('user', fn ($query) => $query->where('role', 'student'))
                ->when($termCode, fn ($query) => $query->where('term_code', $termCode))
                ->lockForUpdate()
                ->get()
                ->filter(fn (StudentDeviceBinding $binding) => (
                    $binding->user && $this->canAccessCollege($request->user(), $binding->user->college)
                ))
                ->when($facultyId !== '', fn ($records) => $records->filter(fn (StudentDeviceBinding $binding) => (
                    UniversityCatalog::canonicalFacultyId($binding->user?->college) === $facultyId
                )));

            $activated = $bindings->count();
            $studentIds = $bindings
                ->pluck('user_id')
                ->filter()
                ->unique()
                ->values();

            StudentDeviceBinding::query()
                ->whereIn('id', $bindings->pluck('id')->all())
                ->delete();

            if ($studentIds->isNotEmpty()) {
                User::query()
                    ->whereIn('id', $studentIds->all())
                    ->increment('activation_count');
            }

            $revokedSessions = ApiToken::query()
                ->whereIn('user_id', $studentIds->all())
                ->delete();

            return response()->json([
                'activated' => $activated,
                'revokedSessions' => $revokedSessions,
            ]);
        });
    }

    private function studentPayload(array $data, ?User $student = null): array
    {
        $studentId = trim((string) ($data['studentId'] ?? $data['universityId'] ?? $student?->student_id ?? ''));
        $nationalId = trim((string) ($data['nationalId'] ?? $student?->national_id ?? ''));
        $email = trim((string) ($data['email'] ?? $student?->email ?? ''));
        $password = trim((string) ($data['password'] ?? ''));

        if ($email === '') {
            $email = $nationalId ?: (($studentId ?: uniqid('student-', false)).'@student.local');
        }

        return [
            ...$data,
            'id' => $student?->id ?? ($data['id'] ?? null),
            'email' => $email,
            'password' => $password !== '' ? $password : ($student ? '' : ($studentId ?: '123456')),
            'userRole' => 'student',
            'role' => 'student',
            'studentId' => $studentId,
            'universityId' => $data['universityId'] ?? $studentId,
            'college' => UniversityCatalog::canonicalCollegeName($data['college'] ?? $student?->college ?? ''),
            'permissions' => [],
            'allowedColleges' => [],
            'courses' => [],
        ];
    }

    private function abortOnDuplicateStudent(array $data, ?string $exceptId = null): void
    {
        $studentId = trim((string) ($data['studentId'] ?? ''));
        $nationalId = trim((string) ($data['nationalId'] ?? ''));

        $duplicate = User::query()
            ->where('role', 'student')
            ->when($exceptId, fn ($query) => $query->where('id', '!=', $exceptId))
            ->where(function ($query) use ($studentId, $nationalId) {
                if ($studentId !== '') {
                    $query->orWhere('student_id', $studentId)->orWhere('university_id', $studentId);
                }

                if ($nationalId !== '') {
                    $query->orWhere('national_id', $nationalId);
                }
            })
            ->exists();

        abort_if($duplicate, 422, 'A student with the same Student ID or National ID already exists.');
    }

    private function authorizePermission(Request $request, string $permission): void
    {
        $user = $request->user();
        abort_unless($user !== null && $this->hasPermission($user, $permission), 403);
    }

    private function authorizeCollege(Request $request, ?string $college): void
    {
        abort_unless($this->canAccessCollege($request->user(), $college), 403);
    }

    private function hasPermission(User $user, string $permission): bool
    {
        if ($user->is_system) {
            return true;
        }

        $permissions = $user->permissions ?: [];

        return in_array($permission, $permissions, true)
            || in_array(Permissions::FULL_DASHBOARD_ACCESS, $permissions, true);
    }

    private function canAccessCollege(?User $user, ?string $college): bool
    {
        if (! $user || $user->is_system) {
            return true;
        }

        $allowedColleges = $user->allowed_colleges ?: [];

        return count($allowedColleges) === 0 || collect($allowedColleges)
            ->contains(fn ($allowedCollege) => UniversityCatalog::sameCollege($allowedCollege, $college));
    }

    private function applyCollegeAccessScope($query, ?User $user): void
    {
        if (! $user || $user->is_system || empty($user->allowed_colleges)) {
            return;
        }

        $collegeNames = collect($user->allowed_colleges)
            ->flatMap(function ($college) {
                $record = UniversityCatalog::findCollege($college);
                return $record
                    ? [$record['id'] ?? null, $record['name_ar'] ?? null, $record['name_en'] ?? null, ...($record['aliases'] ?? [])]
                    : [$college];
            })
            ->filter()
            ->unique()
            ->values()
            ->all();

        $query->whereIn('college', $collegeNames);
    }

    private function applyStudentSearch($query, string $search, ?string $termCode): void
    {
        if ($search === '') return;

        $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
        $query->where(function ($scope) use ($like, $termCode) {
            $scope->where('full_name', 'like', $like)
                ->orWhere('student_id', 'like', $like)
                ->orWhere('university_id', 'like', $like)
                ->orWhere('national_id', 'like', $like)
                ->orWhere('college', 'like', $like)
                ->orWhereHas('registrations', fn ($registrations) => $registrations
                    ->when($termCode, fn ($q) => $q->where('term_code', $termCode))
                    ->where(function ($fields) use ($like) {
                        $fields->where('subject_code', 'like', $like)
                            ->orWhere('subject_name', 'like', $like)
                            ->orWhere('group', 'like', $like)
                            ->orWhere('type', 'like', $like);
                    }));
        });
    }

    private function collegeNamesForFaculty(string $facultyId): array
    {
        $faculty = UniversityCatalog::findFaculty($facultyId);

        return collect($faculty['colleges'] ?? [])
            ->flatMap(fn ($college) => [
                $college['id'] ?? null,
                $college['name_ar'] ?? null,
                $college['name_en'] ?? null,
                ...($college['aliases'] ?? []),
            ])
            ->filter()
            ->values()
            ->all();
    }
}
