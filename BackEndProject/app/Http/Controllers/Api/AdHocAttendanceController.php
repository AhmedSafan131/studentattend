<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdHocAttendanceRecord;
use App\Models\AdHocAttendanceSession;
use App\Models\AttendanceRecord;
use App\Models\LectureSession;
use App\Models\StudentRegistration;
use App\Models\User;
use App\Services\Attendance\AttendanceQrTokenService;
use App\Services\Attendance\FlexibleSessionExpiryService;
use App\Support\FlexibleAttendanceRegistration;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdHocAttendanceController extends Controller
{
    private const DEFAULT_QR_WINDOW_SECONDS = 10;

    public function __construct(
        private readonly AttendanceQrTokenService $qrTokens,
        private readonly FlexibleSessionExpiryService $sessionExpiry,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $this->canUseAdHocAttendance($user)) {
            return response()->json(['message' => 'You cannot view flexible attendance sessions.'], 403);
        }

        $this->sessionExpiry->expireDueSessions();

        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: \App\Models\AcademicTerm::getActiveTermCode();

        $scope = AdHocAttendanceSession::query()
            ->when($termCode, fn ($builder) => $builder->where('term_code', $termCode))
            ->when($user->role !== 'admin', fn ($builder) => $builder->where('user_id', $user->id));

        $filterOptions = $user->role === 'admin' ? $this->sessionFilterOptions($scope) : null;
        $query = (clone $scope)
            ->with(['owner', 'migratedBy', 'linkedLectureSession'])
            ->withCount('records');

        $this->applySessionSearch($query, trim((string) $request->query('search', '')));
        $this->applySessionFilters($query, [
            'faculty' => trim((string) $request->query('faculty', '')),
            'subject' => trim((string) $request->query('subject', '')),
            'lectureType' => trim((string) $request->query('lectureType', '')),
            'group' => trim((string) $request->query('group', '')),
            'week' => trim((string) $request->query('week', '')),
            'status' => trim((string) $request->query('status', '')),
        ]);

        $query->latest();
        $includeRecords = $request->boolean('includeRecords', true);

        if ($request->has('page') || $request->has('perPage')) {
            $perPage = min(50, max(1, (int) $request->query('perPage', 10)));
            $paginator = $query->paginate($perPage);
            $sessions = $paginator->getCollection()
                ->map(fn (AdHocAttendanceSession $session) => $this->sessionPayload($session, false))
                ->values();

            return response()->json([
                'sessions' => $sessions,
                'filters' => $filterOptions,
                'pagination' => [
                    'currentPage' => $paginator->currentPage(),
                    'totalPages' => $paginator->lastPage(),
                    'perPage' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ]);
        }

        $sessions = $query
            ->when($includeRecords, fn ($builder) => $builder->with('records.student'))
            ->get()
            ->map(function (AdHocAttendanceSession $session) use ($includeRecords) {
                $this->hydrateSessionFromLinkedLectureSession($session);
                return $this->sessionPayload($session, $includeRecords);
            });

        return response()->json(['sessions' => $sessions]);
    }

    public function show(Request $request, AdHocAttendanceSession $session): JsonResponse
    {
        $user = $request->user();

        if (! $this->canUseAdHocAttendance($user) || ! $this->canManageSession($user, $session)) {
            return response()->json(['message' => 'You cannot view this flexible attendance session.'], 403);
        }

        $this->sessionExpiry->expireIfDue($session);

        $session->load(['owner', 'records.student', 'migratedBy', 'linkedLectureSession']);
        $this->hydrateSessionFromLinkedLectureSession($session);

        return response()->json([
            'session' => $this->sessionPayload($session),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $this->canUseAdHocAttendance($user)) {
            return response()->json(['message' => 'Only staff accounts can create flexible attendance sessions.'], 403);
        }

        $data = $request->validate([
            'subjectName' => ['required', 'string', 'max:255'],
            'subjectCode' => ['nullable', 'string', 'max:50'],
            'faculty' => ['required', 'string', 'max:255'],
            'lectureType' => ['required', 'string', 'max:50'],
            'group' => ['nullable', 'string', 'max:50'],
            'allowAllGroups' => ['nullable', 'boolean'],
            'week' => ['required', 'string', 'max:50'],
            'qrWindowSeconds' => ['nullable', 'integer', 'in:3,5,10,15'],
        ]);

        $termCode = \App\Models\AcademicTerm::getActiveTermCode();

        $session = DB::transaction(function () use ($data, $user, $termCode) {
            $session = AdHocAttendanceSession::query()->create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'subject_name' => trim($data['subjectName']),
                'subject_code' => isset($data['subjectCode']) ? $this->nullableCode($data['subjectCode']) : null,
                'faculty' => trim($data['faculty']),
                'lecture_type' => trim($data['lectureType']),
                'group' => isset($data['group']) ? $this->nullableText($data['group']) : null,
                'allow_all_groups' => (bool) ($data['allowAllGroups'] ?? false),
                'week' => $this->normalizeWeek($data['week']),
                'qr_window_seconds' => (int) ($data['qrWindowSeconds'] ?? self::DEFAULT_QR_WINDOW_SECONDS),
                'status' => 'open',
                'started_at' => now(),
                'term_code' => $termCode,
            ]);

            $this->ensureLinkedLectureSession($session);

            return $session;
        });

        return response()->json([
            'message' => 'Flexible attendance session created.',
            'session' => $this->sessionPayload($session->load(['owner', 'records.student', 'migratedBy'])),
            ...$this->issueQrPayload($session, (int) ($session->qr_window_seconds ?: self::DEFAULT_QR_WINDOW_SECONDS)),
        ], 201);
    }

    public function qrToken(Request $request, AdHocAttendanceSession $session): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageSession($user, $session)) {
            return response()->json(['message' => 'You cannot generate a QR token for this flexible attendance session.'], 403);
        }

        $this->sessionExpiry->expireIfDue($session);

        if ($session->status !== 'open') {
            return response()->json(['message' => 'This flexible attendance session is not open.'], 409);
        }

        $data = $request->validate([
            'window' => ['nullable', 'integer', 'in:3,5,10,15'],
        ]);

        $windowSeconds = (int) ($data['window'] ?? $session->qr_window_seconds ?: self::DEFAULT_QR_WINDOW_SECONDS);

        if ($windowSeconds !== (int) ($session->qr_window_seconds ?: self::DEFAULT_QR_WINDOW_SECONDS)) {
            $session->forceFill([
                'qr_window_seconds' => $windowSeconds,
            ])->save();
        }

        return response()->json($this->issueQrPayload($session, $windowSeconds));
    }

    public function addStudent(Request $request, AdHocAttendanceSession $session): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageSession($user, $session)) {
            return response()->json(['message' => 'You cannot edit this flexible attendance session.'], 403);
        }

        if ($session->status === 'migrated') {
            return response()->json(['message' => 'This migrated session can no longer be edited.'], 409);
        }

        $data = $request->validate([
            'studentId' => ['required', 'string', 'max:255'],
        ]);

        $student = $this->findStudent($data['studentId']);

        if (! $student) {
            return response()->json(['message' => 'Student was not found.'], 404);
        }

        $this->recordStudentAttendance($session, $student);

        return response()->json([
            'message' => 'Student added to flexible attendance session.',
            'session' => $this->sessionPayload($session->fresh(['owner', 'records.student', 'migratedBy'])),
        ]);
    }

    /** Shared writer for manual entry and roster selection; callers authorize first. */
    public function recordStudentAttendance(
        AdHocAttendanceSession $session,
        User $student,
        bool $eligibilityConfirmed = false,
    ): void
    {
        abort_if($session->status === 'migrated', 409, 'This migrated session can no longer be edited.');
        if (! $eligibilityConfirmed) {
            abort_unless(
                FlexibleAttendanceRegistration::studentIsRosterEligible($session, $student),
                422,
                'لا يمكن إضافة الطالب؛ يجب أن يكون تابعًا للكلية المحددة ومسجلًا في المادة ومطابقًا لنوع الجلسة وإعداد المجموعة.'
            );
        }

        DB::transaction(function () use ($session, $student) {
            $scannedAt = now();

            AdHocAttendanceRecord::query()->updateOrCreate(
                [
                    'ad_hoc_attendance_session_id' => $session->id,
                    'student_id' => $student->id,
                ],
                [
                    'scanned_at' => $scannedAt,
                ],
            );

            $this->syncStudentToOfficialAttendance($session->fresh(), $student, $scannedAt);
        });
    }

    public function addStudentsBulk(Request $request, AdHocAttendanceSession $session): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageSession($user, $session)) {
            return response()->json(['message' => 'You cannot edit this flexible attendance session.'], 403);
        }

        if ($session->status === 'migrated') {
            return response()->json(['message' => 'This migrated session can no longer be edited.'], 409);
        }

        $data = $request->validate([
            'studentIdentifiers' => ['required', 'array', 'min:1', 'max:500'],
            'studentIdentifiers.*' => ['required', 'string', 'max:255'],
        ]);

        $studentIdentifiers = collect($data['studentIdentifiers'])
            ->map(fn ($identifier) => trim((string) $identifier))
            ->filter()
            ->unique()
            ->values();

        $students = User::query()
            ->where('role', 'student')
            ->where(function ($query) use ($studentIdentifiers) {
                $query->whereIn('national_id', $studentIdentifiers)
                    ->orWhereIn('student_id', $studentIdentifiers)
                    ->orWhereIn('university_id', $studentIdentifiers)
                    ->orWhereIn('id', $studentIdentifiers);
            })
            ->get();

        $studentsByIdentifier = collect();
        foreach ($students as $student) {
            foreach ([$student->national_id, $student->student_id, $student->university_id, $student->id] as $identifier) {
                $identifier = trim((string) $identifier);
                if ($identifier !== '' && $studentIdentifiers->contains($identifier)) {
                    $studentsByIdentifier->put($identifier, $student);
                }
            }
        }

        $existingStudentIds = AdHocAttendanceRecord::query()
            ->where('ad_hoc_attendance_session_id', $session->id)
            ->pluck('student_id')
            ->flip();
        $eligibleStudentIds = FlexibleAttendanceRegistration::applyRosterScope(
            User::query()->whereIn('id', $students->pluck('id')),
            $session,
        )->pluck('id')->flip();

        $added = 0;
        $alreadyPresent = [];
        $notFound = [];
        $notRegistered = [];
        $attendanceSession = $session->fresh();

        DB::transaction(function () use ($session, $attendanceSession, $studentIdentifiers, $studentsByIdentifier, $existingStudentIds, $eligibleStudentIds, &$added, &$alreadyPresent, &$notFound, &$notRegistered) {
            $scannedAt = now();

            foreach ($studentIdentifiers as $identifier) {
                $student = $studentsByIdentifier->get($identifier);

                if (! $student) {
                    $notFound[] = $identifier;
                    continue;
                }

                if (! $eligibleStudentIds->has($student->id)) {
                    $notRegistered[] = $identifier;
                    continue;
                }

                if ($existingStudentIds->has($student->id)) {
                    $alreadyPresent[] = $identifier;
                    continue;
                }

                AdHocAttendanceRecord::query()->create([
                    'ad_hoc_attendance_session_id' => $session->id,
                    'student_id' => $student->id,
                    'scanned_at' => $scannedAt,
                ]);

                $this->syncStudentToOfficialAttendance($attendanceSession, $student, $scannedAt);
                $existingStudentIds->put($student->id, true);
                $added++;
            }
        });

        return response()->json([
            'message' => 'Students processed for flexible attendance session.',
            'session' => $this->sessionPayload($session->fresh(['owner', 'records.student', 'migratedBy'])),
            'summary' => [
                'requested' => $studentIdentifiers->count(),
                'added' => $added,
                'alreadyPresent' => $alreadyPresent,
                'notFound' => $notFound,
                'notRegistered' => $notRegistered,
            ],
        ]);
    }

    public function destroyRecord(Request $request, AdHocAttendanceSession $session, AdHocAttendanceRecord $record): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageSession($user, $session)) {
            return response()->json(['message' => 'You cannot edit this flexible attendance session.'], 403);
        }

        if ($record->ad_hoc_attendance_session_id !== $session->id) {
            return response()->json(['message' => 'Attendance record does not belong to this session.'], 404);
        }

        DB::transaction(function () use ($record, $session) {
            $this->removeStudentFromOfficialAttendance($session, $record->student_id);
            $record->delete();
        });

        return response()->json([
            'message' => 'Student removed from flexible attendance session.',
            'session' => $this->sessionPayload($session->fresh(['owner', 'records.student', 'migratedBy'])),
        ]);
    }

    public function destroy(Request $request, AdHocAttendanceSession $session): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageSession($user, $session)) {
            return response()->json(['message' => 'You cannot delete this flexible attendance session.'], 403);
        }

        DB::transaction(function () use ($session) {
            $linkedLectureSessionId = $session->linked_lecture_session_id;

            $session->records()->delete();
            $session->delete();

            if ($linkedLectureSessionId) {
                LectureSession::query()->whereKey($linkedLectureSessionId)->delete();
            }
        });

        return response()->json([
            'message' => 'Flexible attendance session deleted.',
        ]);
    }

    public function close(Request $request, AdHocAttendanceSession $session): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageSession($user, $session)) {
            return response()->json(['message' => 'You cannot close this flexible attendance session.'], 403);
        }

        if ($session->status !== 'migrated') {
            $session->forceFill([
                'status' => 'closed',
                'ended_at' => now(),
            ])->save();

            $this->syncLinkedLectureSessionStatus($session);
        }

        return response()->json([
            'message' => 'Flexible attendance session closed.',
            'session' => $this->sessionPayload($session->fresh(['owner', 'records.student', 'migratedBy'])),
        ]);
    }

    public function closeAll(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Only admins can close all flexible attendance sessions.'], 403);
        }

        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'batchSize' => ['nullable', 'integer', 'min:1', 'max:100'],
            'cursor' => ['nullable', 'string', 'max:255'],
        ]);
        $termCode = $request->header('X-Academic-Term') ?: \App\Models\AcademicTerm::getActiveTermCode();
        $query = AdHocAttendanceSession::query()
            ->where('status', 'open')
            ->when($termCode, fn (Builder $builder) => $builder->where('term_code', $termCode));

        $this->applySessionSearch($query, trim((string) ($data['search'] ?? '')));

        $linkedLectureSessionIds = (clone $query)
            ->whereNotNull('linked_lecture_session_id')
            ->pluck('linked_lecture_session_id')
            ->unique()
            ->values();
        $closedAt = now();

        $closedCount = DB::transaction(function () use ($query, $linkedLectureSessionIds, $closedAt) {
            $count = $query->update([
                'status' => 'closed',
                'ended_at' => $closedAt,
                'updated_at' => $closedAt,
            ]);

            if ($linkedLectureSessionIds->isNotEmpty()) {
                LectureSession::query()
                    ->whereIn('id', $linkedLectureSessionIds)
                    ->update([
                        'status' => 'ended',
                        'ended_at' => $closedAt,
                        'updated_at' => $closedAt,
                    ]);
            }

            return $count;
        });

        return response()->json([
            'message' => 'Matching flexible attendance sessions closed.',
            'closedCount' => $closedCount,
        ]);
    }

    public function reopen(Request $request, AdHocAttendanceSession $session): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageSession($user, $session)) {
            return response()->json(['message' => 'You cannot reopen this flexible attendance session.'], 403);
        }

        if ($session->status === 'migrated') {
            return response()->json(['message' => 'This session was already migrated and cannot be reopened.'], 422);
        }

        $data = $request->validate([
            'qrWindowSeconds' => ['nullable', 'integer', 'in:3,5,10,15'],
            'allowAllGroups' => ['nullable', 'boolean'],
        ]);

        $session->forceFill([
            'status' => 'open',
            'started_at' => now(),
            'ended_at' => null,
            'qr_window_seconds' => (int) ($data['qrWindowSeconds'] ?? $session->qr_window_seconds ?? self::DEFAULT_QR_WINDOW_SECONDS),
            'allow_all_groups' => (bool) ($data['allowAllGroups'] ?? $session->allow_all_groups),
        ])->save();

        $this->syncLinkedLectureSessionStatus($session);

        return response()->json([
            'message' => 'Flexible attendance session reopened.',
            'session' => $this->sessionPayload($session->fresh(['owner', 'records.student', 'migratedBy'])),
            ...$this->issueQrPayload($session, (int) ($session->qr_window_seconds ?: self::DEFAULT_QR_WINDOW_SECONDS)),
        ]);
    }

    public function migrationPreview(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Only admins can migrate flexible attendance sessions.'], 403);
        }

        $search = trim((string) $request->query('search', ''));
        $termCode = $request->header('X-Academic-Term') ?: \App\Models\AcademicTerm::getActiveTermCode();
        $candidateCount = $this->migrationCandidateQuery($termCode, $search)->count();
        $eligibleCount = $this->migrationEligibleQuery($termCode, $search)->count();

        return response()->json([
            'eligibleCount' => $eligibleCount,
            'skippedCount' => max(0, $candidateCount - $eligibleCount),
        ]);
    }

    public function migrateAll(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Only admins can migrate flexible attendance sessions.'], 403);
        }

        // This is an explicit batch operation; allow enough time for large terms.
        set_time_limit(300);

        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'batchSize' => ['nullable', 'integer', 'min:1', 'max:100'],
            'cursor' => ['nullable', 'string', 'max:255'],
        ]);
        $search = trim((string) ($data['search'] ?? ''));
        $termCode = $request->header('X-Academic-Term') ?: \App\Models\AcademicTerm::getActiveTermCode();
        $candidateCount = $this->migrationCandidateQuery($termCode, $search)->count();
        $eligibleQuery = $this->migrationEligibleQuery($termCode, $search);
        $eligibleCount = (clone $eligibleQuery)->count();
        $migratedSessions = 0;
        $migratedStudents = 0;
        $failedSessions = [];
        $batchSize = isset($data['batchSize']) ? (int) $data['batchSize'] : null;
        $cursor = trim((string) ($data['cursor'] ?? ''));
        $processedCount = 0;
        $nextCursor = $cursor ?: null;

        $processSessions = function ($sessions) use ($user, &$migratedSessions, &$migratedStudents, &$failedSessions): void {
            foreach ($sessions as $session) {
                try {
                    $result = $this->migrateSessionToOfficialAttendance(
                        $session,
                        $user,
                        $this->normalizeCode($session->subject_code),
                        trim((string) $session->lecture_type),
                        $this->normalizeGroup($session->group),
                        $this->normalizeWeek($session->week),
                        $session->faculty,
                    );

                    if (! $result) continue;

                    [, , $studentCount] = $result;
                    $migratedSessions++;
                    $migratedStudents += $studentCount;
                } catch (\Throwable $exception) {
                    report($exception);

                    if (count($failedSessions) < 10) {
                        $failedSessions[] = $session->subject_code ?: $session->id;
                    }
                }
            }
        };

        if ($batchSize) {
            $batch = $eligibleQuery->when($cursor !== '', fn ($query) => $query->where('id', '>', $cursor))
                ->with('records.student')->orderBy('id')->limit($batchSize)->get();
            $processedCount = $batch->count();
            $nextCursor = $batch->last()?->id ?: $nextCursor;
            $processSessions($batch);
        } else {
            // Preserve the original one-request API for integrations and tests.
            $eligibleQuery->with('records.student')->orderBy('id')
                ->chunkById(100, $processSessions, 'id');
        }

        $remainingEligible = $this->migrationEligibleQuery($termCode, $search)
            ->when($batchSize && $nextCursor, fn ($query) => $query->where('id', '>', $nextCursor))
            ->count();

        return response()->json([
            'message' => 'Matching flexible attendance sessions migrated.',
            'eligibleCount' => $eligibleCount,
            'migratedSessions' => $migratedSessions,
            'migratedStudents' => $migratedStudents,
            'skippedCount' => max(0, $candidateCount - $eligibleCount),
            'failedSessions' => $failedSessions,
            'remainingEligible' => $remainingEligible,
            'batchComplete' => $remainingEligible === 0,
            'processedCount' => $batchSize ? $processedCount : $eligibleCount,
            'nextCursor' => $nextCursor,
        ]);
    }

    public function migrate(Request $request, AdHocAttendanceSession $session): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Only admins can migrate flexible attendance sessions.'], 403);
        }

        $data = $request->validate([
            'courseCode' => ['required', 'string', 'max:50'],
            'lectureType' => ['required', 'string', 'max:50'],
            'group' => ['required', 'string', 'max:50'],
            'week' => ['required', 'string', 'max:50'],
            'faculty' => ['nullable', 'string', 'max:255'],
        ]);

        $session->loadMissing(['records.student']);

        if ($session->records->isEmpty()) {
            return response()->json(['message' => 'This flexible attendance session has no students to migrate.'], 422);
        }

        $courseCode = $this->normalizeCode($data['courseCode']);
        $lectureType = trim($data['lectureType']);
        $group = $this->normalizeGroup($data['group']);
        $week = $this->normalizeWeek($data['week']);

        [, $lectureSession, $migratedCount] = $this->migrateSessionToOfficialAttendance(
            $session,
            $user,
            $courseCode,
            $lectureType,
            $group,
            $week,
            isset($data['faculty']) ? trim($data['faculty']) : null,
        );

        return response()->json([
            'message' => 'Flexible attendance migrated to the real attendance table.',
            'migratedCount' => $migratedCount,
            'lectureSessionId' => $lectureSession->id,
            'session' => $this->sessionPayload($session->fresh(['owner', 'records.student', 'migratedBy'])),
        ]);
    }

    private function canUseAdHocAttendance(User $user): bool
    {
        return in_array($user->role, ['admin', 'doctor', 'staff'], true);
    }

    private function migrationCandidateQuery(?string $termCode, string $search): Builder
    {
        $query = AdHocAttendanceSession::query()
            ->where('status', '!=', 'migrated')
            ->has('records')
            ->when($termCode, fn (Builder $builder) => $builder->where('term_code', $termCode));

        $this->applySessionSearch($query, $search);

        return $query;
    }

    private function migrationEligibleQuery(?string $termCode, string $search): Builder
    {
        $registeredSubjectCodes = StudentRegistration::query()
            ->where('term_code', $termCode)
            ->pluck('subject_code')
            ->map(fn ($courseCode) => $this->normalizeCode((string) $courseCode))
            ->filter()
            ->unique()
            ->values()
            ->all();
        $query = $this->migrationCandidateQuery($termCode, $search)
            ->whereNotNull('subject_code')
            ->where('subject_code', '!=', '')
            ->whereNotNull('lecture_type')
            ->where('lecture_type', '!=', '')
            ->whereNotNull('group')
            ->where('group', '!=', '')
            ->whereNotNull('week')
            ->where('week', '!=', '');

        if (! $registeredSubjectCodes) {
            return $query->whereRaw('1 = 0');
        }

        return $query->whereIn(DB::raw('UPPER(subject_code)'), $registeredSubjectCodes);
    }

    private function migrateSessionToOfficialAttendance(
        AdHocAttendanceSession $session,
        User $user,
        string $courseCode,
        string $lectureType,
        string $group,
        string $week,
        ?string $faculty,
    ): ?array {
        $session->loadMissing(['records.student']);

        if ($session->records->isEmpty()) {
            return null;
        }

        [$migratedSession, $lectureSession, $migratedCount] = DB::transaction(function () use (
            $session,
            $user,
            $courseCode,
            $lectureType,
            $group,
            $week,
            $faculty,
        ) {
            [$lectureSession, $isExistingOfficialSession] = $this->resolveOfficialMigrationSession(
                $session->fresh(),
                $courseCode,
                $lectureType,
                $group,
                $week,
            );

            $officialUpdates = [
                'course_code' => $courseCode,
                'lecture_type' => $lectureType,
                'group' => $group,
                'allow_all_groups' => (bool) $session->allow_all_groups,
                'week' => $week,
            ];

            if (! $isExistingOfficialSession) {
                $officialUpdates = array_merge($officialUpdates, [
                    'status' => 'ended',
                    'started_at' => $session->started_at ?? $lectureSession->started_at ?? now(),
                    'ended_at' => now(),
                ]);
            }

            $lectureSession->forceFill($officialUpdates)->save();

            $migratedCount = 0;
            $termCode = $lectureSession->term_code ?: $session->term_code ?: \App\Models\AcademicTerm::getActiveTermCode();

            foreach ($session->records as $record) {
                $officialRecord = AttendanceRecord::query()->firstOrNew(
                    [
                        'lecture_session_id' => $lectureSession->id,
                        'student_id' => $record->student_id,
                    ],
                );

                $officialRecord->fill([
                    'course_code' => $courseCode,
                    'lecture_type' => $lectureType,
                    'group' => $group,
                    'week' => $week,
                    'term_code' => $termCode,
                    'scanned_at' => $officialRecord->exists
                        ? $officialRecord->scanned_at
                        : ($record->scanned_at ?? now()),
                ])->save();

                $migratedCount++;
            }

            $session->forceFill([
                'linked_lecture_session_id' => $lectureSession->id,
                'status' => 'migrated',
                'ended_at' => $session->ended_at ?? now(),
                'migrated_at' => now(),
                'migrated_to_course_code' => $courseCode,
                'migrated_to_lecture_type' => $lectureType,
                'migrated_to_group' => $group,
                'migrated_to_week' => $week,
                'migrated_to_faculty' => $faculty,
                'migrated_by' => $user->id,
            ])->save();

            return [
                $session->fresh(['owner', 'records.student', 'migratedBy']),
                $lectureSession->fresh(),
                $migratedCount,
            ];
        });

        return [$migratedSession, $lectureSession, $migratedCount];
    }

    private function resolveOfficialMigrationSession(
        AdHocAttendanceSession $session,
        string $courseCode,
        string $lectureType,
        string $group,
        string $week,
    ): array {
        $linkedSession = $this->ensureLinkedLectureSession($session);
        $termCode = $session->term_code ?: $linkedSession->term_code ?: \App\Models\AcademicTerm::getActiveTermCode();
        $temporaryLinkedIds = AdHocAttendanceSession::query()
            ->where('status', '!=', 'migrated')
            ->whereNotNull('linked_lecture_session_id')
            ->pluck('linked_lecture_session_id');

        $officialSession = LectureSession::query()
            ->where('user_id', $session->user_id)
            ->where('term_code', $termCode)
            ->where('id', '!=', $linkedSession->id)
            ->whereRaw('UPPER(TRIM(course_code)) = ?', [$this->normalizeCode($courseCode)])
            ->whereRaw('UPPER(TRIM(lecture_type)) = ?', [$this->normalizeCode($lectureType)])
            ->whereRaw('UPPER(TRIM(`group`)) = ?', [$this->normalizeCode($group)])
            ->when($temporaryLinkedIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $temporaryLinkedIds))
            ->oldest('started_at')
            ->get()
            ->first(fn (LectureSession $candidate) => $this->normalizeWeek($candidate->week) === $week);

        if (! $officialSession) {
            return [$linkedSession, false];
        }

        foreach ($linkedSession->attendanceRecords()->get() as $record) {
            $existingRecord = $officialSession->attendanceRecords()
                ->where('student_id', $record->student_id)
                ->first();

            if ($existingRecord) {
                $record->delete();
            } else {
                $record->forceFill(['lecture_session_id' => $officialSession->id])->save();
            }
        }

        AdHocAttendanceSession::query()
            ->where('linked_lecture_session_id', $linkedSession->id)
            ->update(['linked_lecture_session_id' => $officialSession->id]);
        $linkedSession->delete();

        return [$officialSession->fresh(), true];
    }

    private function applySessionSearch(Builder $query, string $search): void
    {
        if ($search === '') {
            return;
        }

        $query->where(function (Builder $builder) use ($search) {
            $builder
                ->where('subject_name', 'like', "%{$search}%")
                ->orWhere('subject_code', 'like', "%{$search}%")
                ->orWhere('faculty', 'like', "%{$search}%")
                ->orWhere('lecture_type', 'like', "%{$search}%")
                ->orWhere('group', 'like', "%{$search}%")
                ->orWhere('week', 'like', "%{$search}%")
                ->orWhere('status', 'like', "%{$search}%")
                ->orWhereHas('owner', fn (Builder $ownerQuery) => $ownerQuery->where('name', 'like', "%{$search}%"));
        });
    }

    private function applySessionFilters(Builder $query, array $filters): void
    {
        foreach (['faculty' => 'faculty', 'lectureType' => 'lecture_type', 'group' => 'group', 'week' => 'week', 'status' => 'status'] as $key => $column) {
            if ($filters[$key] !== '') {
                $query->where($column, $filters[$key]);
            }
        }

        if ($filters['subject'] !== '') {
            $subject = $filters['subject'];
            $query->where(fn (Builder $builder) => $builder
                ->where('subject_code', $subject)
                ->orWhere('subject_name', $subject));
        }
    }

    private function sessionFilterOptions(Builder $scope): array
    {
        $values = fn (string $column) => (clone $scope)
            ->whereNotNull($column)->where($column, '!=', '')
            ->distinct()->orderBy($column)->pluck($column)->values()->all();

        $subjects = (clone $scope)
            ->where(function (Builder $query) {
                $query->whereNotNull('subject_code')->where('subject_code', '!=', '')
                    ->orWhere(fn (Builder $nameQuery) => $nameQuery
                        ->whereNotNull('subject_name')->where('subject_name', '!=', ''));
            })
            ->select(['subject_code', 'subject_name'])->distinct()
            ->orderBy('subject_name')->get()
            ->map(fn (AdHocAttendanceSession $session) => [
                'value' => trim((string) ($session->subject_code ?: $session->subject_name)),
                'label' => trim(implode(' - ', array_filter([
                    $session->subject_code,
                    $session->subject_name,
                ]))),
            ])->unique('value')->values()->all();

        return [
            'faculties' => $values('faculty'),
            'subjects' => $subjects,
            'lectureTypes' => $values('lecture_type'),
            'groups' => $values('group'),
            'weeks' => $values('week'),
            'statuses' => $values('status'),
        ];
    }

    private function canManageSession(User $user, AdHocAttendanceSession $session): bool
    {
        return $user->role === 'admin' || $session->user_id === $user->id;
    }

    private function findStudent(string $identifier): ?User
    {
        $value = trim($identifier);

        return User::query()
            ->where('role', 'student')
            ->where(function ($query) use ($value) {
                $query->where('id', $value)
                    ->orWhere('student_id', $value)
                    ->orWhere('university_id', $value)
                    ->orWhere('national_id', $value)
                    ->orWhere('email', $value);
            })
            ->first();
    }

    private function sessionPayload(AdHocAttendanceSession $session, bool $includeRecords = true): array
    {
        $records = $includeRecords
            ? $session->records
                ->sortBy(fn (AdHocAttendanceRecord $record) => optional($record->scanned_at)->timestamp ?? $record->id)
                ->values()
                ->map(fn (AdHocAttendanceRecord $record) => $this->recordPayload($record))
                ->all()
            : [];
        $recordCount = $includeRecords
            ? count($records)
            : (int) ($session->records_count ?? 0);

        return [
            'id' => $session->id,
            'subjectName' => $session->subject_name,
            'subjectCode' => $session->subject_code,
            'faculty' => $session->faculty,
            'lectureType' => $session->lecture_type ?: $session->linkedLectureSession?->lecture_type,
            'group' => $session->group ?: $session->linkedLectureSession?->group,
            'allowAllGroups' => (bool) $session->allow_all_groups,
            'week' => $session->week ?: $session->linkedLectureSession?->week,
            'qrWindowSeconds' => (int) ($session->qr_window_seconds ?: self::DEFAULT_QR_WINDOW_SECONDS),
            'linkedLectureSessionId' => $session->linked_lecture_session_id,
            'status' => $session->status,
            'startedAt' => optional($session->started_at)->toISOString(),
            'endedAt' => optional($session->ended_at)->toISOString(),
            'createdAt' => optional($session->created_at)->toISOString(),
            'qrTokenExpiresAt' => optional($session->qr_token_expires_at)->toISOString(),
            'doctor' => [
                'id' => $session->owner?->id,
                'name' => $session->owner?->name,
                'email' => $session->owner?->email,
            ],
            'records' => $records,
            'recordCount' => $recordCount,
            'migration' => [
                'migratedAt' => optional($session->migrated_at)->toISOString(),
                'courseCode' => $session->migrated_to_course_code,
                'lectureType' => $session->migrated_to_lecture_type,
                'group' => $session->migrated_to_group,
                'week' => $session->migrated_to_week,
                'faculty' => $session->migrated_to_faculty,
                'migratedBy' => $session->migratedBy ? [
                    'id' => $session->migratedBy->id,
                    'name' => $session->migratedBy->name,
                ] : null,
            ],
        ];
    }

    private function recordPayload(AdHocAttendanceRecord $record): array
    {
        return [
            'id' => $record->id,
            'studentId' => $record->student_id,
            'studentName' => $record->student?->name,
            'studentUniversityId' => $record->student?->university_id ?: $record->student?->student_id,
            'studentCollege' => $record->student?->college,
            'scannedAt' => optional($record->scanned_at)->toISOString(),
        ];
    }

    private function normalizeCode(string $value): string
    {
        return Str::upper(trim($value));
    }

    private function normalizeGroup(string $value): string
    {
        return (string) Str::of($value)
            ->trim()
            ->upper()
            ->replaceMatches('/^GROUP\s+/', '')
            ->replaceMatches('/^GRP\s+/', '');
    }

    private function normalizeWeek(string $value): string
    {
        $normalized = trim($value);

        if (preg_match('/\d+/', $normalized, $matches)) {
            return (string) ((int) $matches[0]);
        }

        return $normalized;
    }

    private function nullableCode(?string $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $this->normalizeCode($normalized);
    }

    private function nullableText(?string $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function issueQrPayload(AdHocAttendanceSession $session, int $windowSeconds): array
    {
        $issued = $this->qrTokens->issuePair('flexible', (string) $session->id, $windowSeconds);

        return [
            'qrPayload' => $issued['qrPayload'],
            'sessionCode' => $issued['sessionCode'],
            'serverTime' => $issued['issuedAt']->toISOString(),
            'qrExpiresAt' => $issued['expiresAt']->toISOString(),
            'qrWindowSeconds' => $windowSeconds,
        ];
    }

    private function generateQrToken(string $prefix): string
    {
        return $prefix.'-'.Str::upper(Str::random(10));
    }

    private function ensureLinkedLectureSession(AdHocAttendanceSession $session): LectureSession
    {
        if ($session->linked_lecture_session_id) {
            $linkedSession = LectureSession::query()->find($session->linked_lecture_session_id);

            if ($linkedSession) {
                return $linkedSession;
            }
        }

        $lectureSession = LectureSession::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $session->user_id,
            'course_code' => $session->subject_code ?: $session->subject_name,
            'lecture_type' => $session->lecture_type ?: 'Lecture',
            'group' => $this->normalizeGroup($session->group ?: 'A'),
            'allow_all_groups' => (bool) $session->allow_all_groups,
            'week' => $this->normalizeWeek($session->week ?: '1'),
            'status' => $session->status === 'open' ? 'active' : 'ended',
            'started_at' => $session->started_at ?? now(),
            'ended_at' => $session->status === 'open' ? null : ($session->ended_at ?? now()),
            'term_code' => $session->term_code ?: \App\Models\AcademicTerm::getActiveTermCode(),
        ]);

        $session->forceFill([
            'linked_lecture_session_id' => $lectureSession->id,
        ])->save();

        return $lectureSession;
    }

    private function syncStudentToOfficialAttendance(AdHocAttendanceSession $session, User $student, $scannedAt): AttendanceRecord
    {
        $lectureSession = $this->ensureLinkedLectureSession($session);

        return AttendanceRecord::query()->updateOrCreate(
            [
                'lecture_session_id' => $lectureSession->id,
                'student_id' => $student->id,
            ],
            [
                'course_code' => $lectureSession->course_code,
                'lecture_type' => $lectureSession->lecture_type,
                'group' => $lectureSession->group,
                'week' => $lectureSession->week,
                'scanned_at' => $scannedAt ?? now(),
                'term_code' => $lectureSession->term_code ?: $session->term_code ?: \App\Models\AcademicTerm::getActiveTermCode(),
            ],
        );
    }

    private function removeStudentFromOfficialAttendance(AdHocAttendanceSession $session, string $studentId): void
    {
        if (! $session->linked_lecture_session_id) {
            return;
        }

        AttendanceRecord::query()
            ->where('lecture_session_id', $session->linked_lecture_session_id)
            ->where('student_id', $studentId)
            ->delete();
    }

    private function syncLinkedLectureSessionStatus(AdHocAttendanceSession $session): void
    {
        $lectureSession = $this->ensureLinkedLectureSession($session);

        $lectureSession->forceFill([
            'status' => $session->status === 'open' ? 'active' : 'ended',
            'allow_all_groups' => (bool) $session->allow_all_groups,
            'started_at' => $session->started_at ?? $lectureSession->started_at ?? now(),
            'ended_at' => $session->status === 'open' ? null : ($session->ended_at ?? now()),
        ])->save();
    }

    private function syncExistingRecordsToOfficialAttendance(AdHocAttendanceSession $session): void
    {
        $session->loadMissing(['records.student', 'linkedLectureSession']);

        foreach ($session->records as $record) {
            if (! $record->student) {
                continue;
            }

            $this->syncStudentToOfficialAttendance($session, $record->student, $record->scanned_at);
        }
    }

    private function hydrateSessionFromLinkedLectureSession(AdHocAttendanceSession $session): void
    {
        $linkedSession = $session->linkedLectureSession;

        if (! $linkedSession) {
            return;
        }

        $updates = [];

        if (! $session->lecture_type && $linkedSession->lecture_type) {
            $updates['lecture_type'] = $linkedSession->lecture_type;
        }

        if (! $session->group && $linkedSession->group) {
            $updates['group'] = $linkedSession->group;
        }

        if (! $session->week && $linkedSession->week) {
            $updates['week'] = $linkedSession->week;
        }

        if (! empty($updates)) {
            $session->forceFill($updates);
        }
    }
}
