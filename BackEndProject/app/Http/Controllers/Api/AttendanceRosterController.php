<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\AdHocAttendanceRecord;
use App\Models\AdHocAttendanceSession;
use App\Models\AttendanceRecord;
use App\Models\LectureSession;
use App\Models\SystemSetting;
use App\Models\User;
use App\Support\AttendanceRosterOptions;
use App\Support\FlexibleAttendanceRegistration;
use App\Support\Permissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceRosterController extends Controller
{
    public function options(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['data' => $user->role === 'admin'
            ? AttendanceRosterOptions::current()
            : ['dashboard' => AttendanceRosterOptions::allowed($user, 'dashboard'),
                'flexible' => AttendanceRosterOptions::allowed($user, 'flexible')]]);
    }

    public function updateOptions(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->role === 'admin' && ($user->is_system
            || array_intersect($user->permissions ?? [], [Permissions::MANAGE_PERMISSIONS, Permissions::FULL_DASHBOARD_ACCESS])), 403);
        $data = $request->validate([
            'enabled' => ['required', 'boolean'], 'allDoctors' => ['required', 'boolean'],
            'dashboard' => ['required', 'boolean'], 'flexible' => ['required', 'boolean'],
            'doctorIds' => ['present', 'array', 'max:5000'],
            'doctorIds.*' => ['required', 'string', 'distinct', 'exists:users,id'],
        ]);
        abort_if(User::whereIn('id', $data['doctorIds'])->whereNotIn('role', ['doctor', 'staff'])->exists(), 422, 'Select doctor accounts only.');
        SystemSetting::updateOrCreate(['key' => 'attendance_roster_options'], ['value' => $data]);

        return response()->json(['data' => $data]);
    }

    private function session(Request $request, string $mode, string $id, bool $lock = false): LectureSession|AdHocAttendanceSession
    {
        abort_unless(AttendanceRosterOptions::allowed($request->user(), $mode), 403, 'Student roster selection is disabled for this account.');
        $term = $request->header('X-Academic-Term') ?: AcademicTerm::getActiveTermCode();
        $session = ($mode === 'dashboard' ? LectureSession::query() : AdHocAttendanceSession::query())
            ->where('user_id', $request->user()->id)->where('term_code', $term)
            ->when($lock, fn (Builder $query) => $query->lockForUpdate())->findOrFail($id);
        abort_if($mode === 'flexible' && $session->status === 'migrated', 422, 'This session was already migrated.');
        abort_if(trim((string) ($mode === 'dashboard' ? $session->course_code : $session->subject_code)) === '', 422, 'Select a session with a subject code first.');

        return $session;
    }

    private function eligible(LectureSession|AdHocAttendanceSession $session, string $mode): Builder
    {
        $course = $mode === 'dashboard' ? $session->course_code : $session->subject_code;
        $query = User::query()->where('role', 'student');
        if ($mode === 'flexible') {
            return FlexibleAttendanceRegistration::applyRosterScope($query, $session);
        }

        $query->whereHas('registrations', fn (Builder $registration) =>
            $this->applyRegistrationScope($registration, $session, $mode, $course));

        return $query;
    }

    private function applyRegistrationScope(
        Builder|Relation $query,
        LectureSession|AdHocAttendanceSession $session,
        string $mode,
        string $course,
    ): void {
        $query->where('term_code', $session->term_code)
            ->whereRaw('UPPER(TRIM(subject_code)) = ?', [strtoupper(trim($course))]);

        // Flexible attendance includes every group for the selected class type,
        // without mixing Lecture, Section, and Practical registrations.
        $filterByType = $mode === 'flexible' || ! $session->allow_all_groups;
        $filterByGroup = ! $session->allow_all_groups;
        if ($filterByType && trim((string) $session->lecture_type) !== '') {
            $query->whereRaw('LOWER(TRIM(type)) = ?', [strtolower(trim((string) $session->lecture_type))]);
        }
        if ($filterByGroup && trim((string) $session->group) !== '') {
            $query->whereRaw('LOWER(TRIM(`group`)) = ?', [strtolower(trim((string) $session->group))]);
        }
    }

    private function present(LectureSession|AdHocAttendanceSession $session, string $mode, array $ids): array
    {
        if ($mode === 'flexible') {
            return AdHocAttendanceRecord::where('ad_hoc_attendance_session_id', $session->id)->whereIn('student_id', $ids)->pluck('student_id')->all();
        }

        // Use the same weekly scope as manual attendance, including other groups.
        return AttendanceRecord::whereIn('student_id', $ids)->where('term_code', $session->term_code)
            ->whereHas('lectureSession', fn (Builder $q) => $q->where('course_code', strtoupper(trim($session->course_code)))
                ->where('lecture_type', trim($session->lecture_type))->where('week', $session->week))
            ->pluck('student_id')->all();
    }

    public function index(Request $request, string $mode, string $id): JsonResponse
    {
        $session = $this->session($request, $mode, $id);
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'group' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);
        $course = $mode === 'dashboard' ? $session->course_code : $session->subject_code;
        $registrationScope = fn (Builder|Relation $query) =>
            $this->applyRegistrationScope($query, $session, $mode, $course);
        $query = $this->eligible($session, $mode)->with(['registrations' => $registrationScope]);
        if ($search = trim($data['search'] ?? '')) {
            $query->where(function (Builder $q) use ($search) {
                foreach (['name', 'full_name', 'student_id', 'university_id', 'national_id'] as $field) {
                    $q->orWhere($field, 'like', '%'.$search.'%');
                }
            });
        }
        if ($group = trim($data['group'] ?? '')) {
            $query->whereHas('registrations', function (Builder $q) use ($registrationScope, $group) {
                $registrationScope($q);
                $q->whereRaw('LOWER(TRIM(`group`)) = ?', [strtolower($group)]);
            });
        }
        $page = $query->orderBy('full_name')->orderBy('id')->paginate($data['perPage'] ?? 50);
        $present = $this->present($session, $mode, $page->getCollection()->pluck('id')->all());

        return response()->json([
            'data' => $page->getCollection()->map(function (User $student) use ($present) {
                $groups = $student->registrations->pluck('group')
                    ->map(fn ($group) => trim((string) $group))->filter()->unique()->values();

                return [
                    'id' => $student->id, 'name' => $student->full_name ?: $student->name,
                    'nationalId' => trim((string) $student->national_id),
                    'groups' => $groups,
                    'isRegistered' => $student->registrations->isNotEmpty(),
                    'present' => in_array($student->id, $present, true),
                ];
            }),
            'total' => $page->total(), 'lastPage' => $page->lastPage(), 'page' => $page->currentPage(),
        ]);
    }

    public function store(Request $request, string $mode, string $id): JsonResponse
    {
        $session = $this->session($request, $mode, $id);
        $data = $request->validate(['studentIds' => ['required', 'array', 'min:1', 'max:500'], 'studentIds.*' => ['required', 'string', 'max:255', 'distinct']]);
        $results = [];
        foreach ($data['studentIds'] as $studentId) {
            // Per-student transactions keep successful rows and allow safe retries.
            $results[] = DB::transaction(function () use ($request, $mode, $id, $studentId) {
                $session = $this->session($request, $mode, $id, true);
                $student = User::whereKey($studentId)->lockForUpdate()->first();
                if (! $student || ! $this->eligible($session, $mode)->whereKey($studentId)->exists()) {
                    return ['id' => $studentId, 'status' => 'failed', 'message' => 'Student is no longer registered in this session scope.'];
                }
                if ($this->present($session, $mode, [$studentId])) {
                    return ['id' => $studentId, 'status' => 'existing'];
                }
                if ($mode === 'flexible') {
                    app(AdHocAttendanceController::class)->recordStudentAttendance($session, $student, true);

                    return ['id' => $studentId, 'status' => 'added'];
                }
                $payload = ['studentId' => $studentId];
                if ($mode === 'dashboard') {
                    $payload += ['lectureSessionId' => $session->id, 'courseCode' => $session->course_code,
                        'lectureType' => $session->lecture_type, 'group' => $session->group, 'week' => $session->week];
                }
                $manual = Request::create('/api/attendance/manual', 'POST', $payload);
                $manual->headers->set('X-Academic-Term', $session->term_code);
                $manual->setUserResolver(fn () => $request->user());
                // Reuse existing writers so reporting and flexible synchronization stay identical.
                $response = app(AttendanceController::class)->storeManual($manual);
                $body = $response->getData(true);

                return ['id' => $studentId, 'status' => $response->getStatusCode() >= 400 ? 'failed'
                    : (str_contains($body['message'] ?? '', 'already recorded') ? 'existing' : 'added'),
                    'message' => $body['message'] ?? '', 'attendance' => $body['attendance'] ?? null];
            });
        }

        return response()->json(['results' => $results]);
    }
}
