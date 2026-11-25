<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\StoreStaffCourseRequest;
use App\Http\Requests\Api\Admin\StoreUserRequest;
use App\Http\Requests\Api\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Admin\StaffCourseService;
use App\Services\Admin\UserManagementService;
use App\Support\Permissions;
use App\Support\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function __construct(
        private readonly UserManagementService $users,
        private readonly StaffCourseService $staffCourses,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeUsersListing($request);

        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: \App\Models\AcademicTerm::getActiveTermCode();

        $admins = User::query()
            ->with([
                'courses' => fn ($query) => $query->when($termCode, fn ($q) => $q->where('term_code', $termCode)),
                'registrations' => fn ($query) => $query->when($termCode, fn ($q) => $q->where('term_code', $termCode)),
            ])
            ->where('role', 'admin')
            ->orderBy('full_name')
            ->get();

        $staff = User::query()
            ->with([
                'courses' => fn ($query) => $query->when($termCode, fn ($q) => $q->where('term_code', $termCode)),
            ])
            ->whereIn('role', ['staff', 'doctor'])
            ->orderBy('full_name')
            ->get();

        $payload = [
            'admins' => UserResource::collection($admins)->resolve($request),
            'doctors' => UserResource::collection($staff)->resolve($request),
        ];

        // Kept as an opt-in compatibility alias. Sending the same collection twice
        // used to almost double this already sizeable response.
        if ($request->boolean('include_staff_alias')) {
            $payload['staff'] = $payload['doctors'];
        }

        return response()->json($payload);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->users->create($request->validated(), \App\Models\AcademicTerm::getActiveTermCode());

        return response()->json((new UserResource($user))->resolve($request), 201);
    }

    public function import(Request $request): JsonResponse
    {
        $this->authorizeDoctorManagement($request);

        $data = $request->validate([
            'doctors' => ['required', 'array', 'min:1', 'max:2000'],
            'doctors.*.name' => ['required', 'string', 'max:255'],
            'doctors.*.email' => ['nullable', 'string', 'max:255'],
            'doctors.*.nationalId' => ['required', 'string', 'max:255'],
            'doctors.*.password' => ['nullable', 'string', 'max:255'],
            'doctors.*.specialty' => ['nullable', 'string', 'max:255'],
            'doctors.*.assignments' => ['nullable', 'array'],
            'doctors.*.assignments.*.id' => ['required', 'string', 'max:50'],
            'doctors.*.assignments.*.name' => ['required', 'string', 'max:255'],
            'doctors.*.assignments.*.faculty' => ['nullable', 'string', 'max:255'],
            'doctors.*.assignments.*.college' => ['nullable', 'string', 'max:255'],
            'doctors.*.assignments.*.type' => ['nullable', 'string', 'max:50'],
        ]);

        $termCode = \App\Models\AcademicTerm::getActiveTermCode();
        $emails = collect($data['doctors'])->pluck('email')->map(fn ($value) => mb_strtolower(trim((string) $value)))->filter()->unique();
        $nationalIds = collect($data['doctors'])->pluck('nationalId')->map(fn ($value) => trim((string) $value))->filter()->unique();
        $existing = User::query()
            ->with(['courses' => fn ($query) => $query->where('term_code', $termCode), 'registrations'])
            ->whereIn('role', ['staff', 'doctor'])
            ->where(fn ($query) => $query->whereIn('email', $emails)->orWhereIn('national_id', $nationalIds))
            ->get();
        $byEmail = $existing->filter(fn (User $user) => filled($user->email))->keyBy(fn (User $user) => mb_strtolower(trim($user->email)));
        $byNationalId = $existing->filter(fn (User $user) => filled($user->national_id))->keyBy(fn (User $user) => trim($user->national_id));

        $summary = DB::transaction(function () use ($data, $termCode, $byEmail, $byNationalId) {
            $doctorsCreated = 0;
            $doctorsUpdated = 0;
            $doctorsReused = 0;
            $assignmentsAdded = 0;
            $assignmentsSkipped = 0;

            foreach ($data['doctors'] as $row) {
                $nationalId = trim((string) $row['nationalId']);
                $email = mb_strtolower(trim((string) ($row['email'] ?? '')));
                $email = $email ?: "staff.{$nationalId}@import.local";
                $doctor = $byNationalId->get($nationalId) ?: $byEmail->get($email);
                $courses = collect($doctor?->courses ?? []);
                $courseKeys = $courses->mapWithKeys(fn ($course) => [
                    Str::upper(trim($course->course_id)).'|'.Str::lower(trim((string) $course->type)).'|'.Str::lower(trim((string) $course->faculty)).'|'.Str::lower(trim((string) $course->college)) => true,
                ]);

                foreach ($row['assignments'] ?? [] as $assignment) {
                    $key = Str::upper(trim($assignment['id'])).'|'.Str::lower(trim((string) ($assignment['type'] ?? 'Lecture'))).'|'.Str::lower(trim((string) ($assignment['faculty'] ?? ''))).'|'.Str::lower(trim((string) ($assignment['college'] ?? '')));
                    if ($courseKeys->has($key)) {
                        $assignmentsSkipped++;
                        continue;
                    }
                    $courses->push($assignment);
                    $courseKeys->put($key, true);
                    $assignmentsAdded++;
                }

                $payload = [
                    'email' => $email,
                    'name' => $row['name'],
                    'fullName' => $row['name'],
                    // Bulk sheets use the password only when creating an account.
                    // Existing staff passwords are managed explicitly outside an
                    // assignment import, avoiding needless bcrypt work and resets.
                    'password' => $doctor ? '' : ($row['password'] ?? ''),
                    'specialty' => $row['specialty'] ?? ($doctor?->specialty ?: '--'),
                    'nationalId' => $nationalId,
                    'userRole' => 'staff',
                    'role' => 'staff',
                    'permissions' => $doctor?->permissions ?? Permissions::defaultsForRole('staff'),
                    'allowedColleges' => $doctor?->allowed_colleges ?? [],
                    'courses' => $courses->map(fn ($course) => is_array($course) ? $course : [
                        'uid' => $course->uid,
                        'id' => $course->course_id,
                        'name' => $course->name,
                        'faculty' => $course->faculty,
                        'college' => $course->college,
                        'type' => $course->type,
                    ])->values()->all(),
                    'registrations' => [],
                ];

                if ($doctor) {
                    $this->users->updateForImport($doctor, $payload, $termCode);
                    $doctorsUpdated++;
                    $doctorsReused++;
                } else {
                    $payload['password'] = $payload['password'] ?: '123456';
                    $doctor = $this->users->createForImport($payload, $termCode);
                    $doctorsCreated++;
                }

                $byEmail->put($email, $doctor);
                $byNationalId->put($nationalId, $doctor);
            }

            return compact('doctorsCreated', 'doctorsUpdated', 'doctorsReused', 'assignmentsAdded', 'assignmentsSkipped');
        });

        return response()->json(['summary' => $summary]);
    }

    public function update(UpdateUserRequest $request, string $id): JsonResponse
    {
        $user = User::query()->with('courses', 'registrations')->findOrFail($id);
        abort_if($user->is_system, 404);

        $user = $this->users->update($user, $request->validated(), \App\Models\AcademicTerm::getActiveTermCode());

        return response()->json((new UserResource($user))->resolve($request));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = User::query()->findOrFail($id);
        if ($user->role === 'admin') {
            $this->authorizePermission($request, Permissions::MANAGE_ADMINS);
        } else {
            $this->authorizePermission($request, Permissions::MANAGE_DOCTORS);
        }
        abort_if($user->is_system, 404);
        $user->delete();

        return response()->json(null, 204);
    }

    public function addCourse(StoreStaffCourseRequest $request, string $staffId): JsonResponse
    {
        $this->authorizeDoctorManagement($request);

        $staff = User::query()->with('courses', 'registrations')->findOrFail($staffId);
        abort_unless(Role::isStaff($staff->role), 404);

        $staff = $this->staffCourses->addCourse($staff, $request->validated());

        return response()->json((new UserResource($staff))->resolve($request));
    }

    public function deleteCourse(Request $request, string $staffId, string $courseUid): JsonResponse
    {
        $this->authorizeDoctorManagement($request);

        $staff = User::query()->with('courses', 'registrations')->findOrFail($staffId);
        abort_unless(Role::isStaff($staff->role), 404);

        $staff = $this->staffCourses->deleteCourse($staff, $courseUid);

        return response()->json((new UserResource($staff))->resolve($request));
    }

    private function authorizeUsersListing(Request $request): void
    {
        $this->authorizeAnyPermission($request, [
            Permissions::MANAGE_DOCTORS,
            Permissions::MANAGE_ADMINS,
        ]);
    }

    private function authorizeDoctorManagement(Request $request): void
    {
        $this->authorizePermission($request, Permissions::MANAGE_DOCTORS);
    }

    private function authorizePermission(Request $request, string $permission): void
    {
        $this->authorizeAnyPermission($request, [$permission]);
    }

    private function authorizeAnyPermission(Request $request, array $requiredPermissions): void
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        if ($user->is_system || $user->role === 'admin') {
            return;
        }

        $permissions = $user->permissions ?: [];

        abort_unless(
            in_array(Permissions::FULL_DASHBOARD_ACCESS, $permissions, true)
            || collect($requiredPermissions)->contains(
                fn (string $permission) => in_array($permission, $permissions, true)
            ),
            403,
        );
    }
}
