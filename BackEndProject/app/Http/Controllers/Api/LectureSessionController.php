<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LectureSession;
use App\Models\AcademicTerm;
use App\Models\CatalogSubject;
use App\Models\CourseAssignment;
use App\Models\AdHocAttendanceSession;
use App\Services\Attendance\AutomaticAbsenceService;
use App\Services\Attendance\AttendanceQrTokenService;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LectureSessionController extends Controller
{
    private const DEFAULT_QR_WINDOW_SECONDS = 10;
    private array $subjectNameCache = [];

    public function __construct(
        private readonly AutomaticAbsenceService $automaticAbsences,
        private readonly AttendanceQrTokenService $qrTokens,
    )
    {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'doctor', 'staff'], true)) {
            return response()->json(['message' => 'Only staff accounts can view attendance sessions.'], 403);
        }

        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: \App\Models\AcademicTerm::getActiveTermCode();

        $query = LectureSession::query()
            ->when($termCode, fn ($q) => $q->where('term_code', $termCode))
            ->whereNotIn('id', AdHocAttendanceSession::query()
                ->select('linked_lecture_session_id')
                ->where('status', '!=', 'migrated')
                ->whereNotNull('linked_lecture_session_id'))
            ->latest('started_at')
            ->latest('created_at');

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        $includeRecords = $request->boolean('includeRecords', true);
        $sessions = $query
            ->when($includeRecords, fn ($builder) => $builder->with(['attendanceRecords.student']))
            ->withCount(['attendanceRecords as record_count'])
            ->limit(300)
            ->get();
        $this->primeSubjectNames($sessions);
        $sessions = $sessions
            ->map(fn (LectureSession $session) => $this->sessionPayload($session, $includeRecords))
            ->values();

        return response()->json([
            'sessions' => $sessions,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'doctor', 'staff'], true)) {
            return response()->json(['message' => 'Only staff accounts can start attendance sessions.'], 403);
        }

        $data = $request->validate([
            'courseCode' => ['required', 'string', 'max:50'],
            'lectureType' => ['required', 'string', 'max:50'],
            'group' => ['required', 'string', 'max:50'],
            'week' => ['required', 'string', 'max:50'],
            'allowAllGroups' => ['nullable', 'boolean'],
            'qrWindowSeconds' => ['nullable', 'integer', 'in:3,5,10,15'],
        ]);

        $courseCode = $this->normalizeCode($data['courseCode']);
        $lectureType = $this->normalizeText($data['lectureType']);
        $group = $this->normalizeCode($data['group']);
        $week = $this->normalizeWeek($data['week']);
        $allowAllGroups = (bool) ($data['allowAllGroups'] ?? false);

        $termCode = AcademicTerm::getActiveTermCode();
        $assignments = $user->courses()->where('term_code', $termCode)->get();
        $matchingAssignments = $assignments->filter(fn ($course) => (
            $this->normalizeCode($course->course_id) === $courseCode
            && $this->normalizeCode($course->type) === $this->normalizeCode($lectureType)
        ));

        if ($user->role !== 'admin' && $matchingAssignments->isEmpty()) {
            return response()->json(['message' => 'You are not assigned to this course or lecture type.'], 403);
        }

        $catalogSubjects = CatalogSubject::query()
            ->whereRaw('UPPER(TRIM(subject_code)) = ?', [$courseCode])
            ->where(fn ($query) => $query->where('term_code', $termCode)->orWhereNull('term_code'))
            ->orderByRaw('CASE WHEN term_code = ? THEN 0 ELSE 1 END', [$termCode])
            ->get()
            ->unique('faculty_id');
        $validGroup = $catalogSubjects->contains(function ($subject) use ($user, $matchingAssignments, $lectureType, $group) {
            if ($user->role !== 'admin' && ! $matchingAssignments->contains(fn ($assignment) => $assignment->faculty === $subject->faculty_id)) {
                return false;
            }
            if (! in_array($lectureType, $subject->types ?: ['Lecture'], true)) {
                return false;
            }
            $count = max(0, min(26, (int) ($subject->group_counts[$lectureType] ?? $subject->group_count ?? 1)));

            return strlen($group) === 1 && $group >= 'A' && $group <= 'Z' && ord($group) - ord('A') < $count;
        });

        if (! $validGroup) {
            return response()->json(['message' => 'The selected type or group is not available in the current term subject catalog.'], 422);
        }

        $this->mergeDuplicateMainSessions($termCode, (string) $user->id);

        [$session, $reopened] = DB::transaction(function () use ($user, $termCode, $courseCode, $lectureType, $group, $week, $allowAllGroups) {
            $session = LectureSession::query()
                ->where('user_id', $user->id)
                ->where('term_code', $termCode)
                ->whereRaw('UPPER(TRIM(course_code)) = ?', [$courseCode])
                ->whereRaw('UPPER(TRIM(lecture_type)) = ?', [$this->normalizeCode($lectureType)])
                ->whereRaw('UPPER(TRIM(`group`)) = ?', [$group])
                ->whereNotIn('id', AdHocAttendanceSession::query()
                    ->select('linked_lecture_session_id')
                    ->where('status', '!=', 'migrated')
                    ->whereNotNull('linked_lecture_session_id'))
                ->oldest('started_at')
                ->oldest('created_at')
                ->lockForUpdate()
                ->get()
                ->first(fn (LectureSession $candidate) => $this->normalizeWeek($candidate->week) === $week);
            $reopened = (bool) $session;

            if ($session) {
                $session->forceFill([
                    'course_code' => $courseCode,
                    'lecture_type' => $lectureType,
                    'group' => $group,
                    'week' => $week,
                    'allow_all_groups' => $allowAllGroups,
                    'status' => 'active',
                    'ended_at' => null,
                ])->save();
            } else {
                $session = LectureSession::query()->create([
                    'id' => (string) Str::uuid(),
                    'user_id' => $user->id,
                    'course_code' => $courseCode,
                    'lecture_type' => $lectureType,
                    'group' => $group,
                    'week' => $week,
                    'allow_all_groups' => $allowAllGroups,
                    'term_code' => $termCode,
                    'status' => 'active',
                    'started_at' => now(),
                ]);
            }

            return [$session, $reopened];
        });

        $session->load('attendanceRecords.student')->loadCount(['attendanceRecords as record_count']);

        if ($reopened) {
            $this->automaticAbsences->removeForReopenedSession($session);
        }

        return response()->json([
            'message' => $reopened ? 'Attendance recording reopened.' : 'Lecture attendance session started.',
            'reopened' => $reopened,
            'session' => $this->sessionPayload($session),
            ...$this->issueQrPayload($session, (int) ($data['qrWindowSeconds'] ?? self::DEFAULT_QR_WINDOW_SECONDS)),
        ], $reopened ? 200 : 201);
    }

    public function show(Request $request, LectureSession $lectureSession): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'doctor', 'staff'], true)
            || ($user->role !== 'admin' && $lectureSession->user_id !== $user->id)) {
            return response()->json(['message' => 'You cannot view this attendance session.'], 403);
        }

        $lectureSession
            ->load(['attendanceRecords.student'])
            ->loadCount(['attendanceRecords as record_count']);

        return response()->json([
            'session' => $this->sessionPayload($lectureSession),
        ]);
    }

    public function qrToken(Request $request, LectureSession $lectureSession): JsonResponse
    {
        $user = $request->user();

        if ($lectureSession->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['message' => 'You cannot generate a QR token for this attendance session.'], 403);
        }

        if ($lectureSession->status !== 'active') {
            return response()->json(['message' => 'This attendance session is not active.'], 409);
        }

        $data = $request->validate([
            'window' => ['nullable', 'integer', 'in:3,5,10,15'],
        ]);

        return response()->json($this->issueQrPayload(
            $lectureSession,
            (int) ($data['window'] ?? self::DEFAULT_QR_WINDOW_SECONDS),
        ));
    }

    public function end(Request $request, LectureSession $lectureSession): JsonResponse
    {
        $user = $request->user();

        if ($lectureSession->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['message' => 'You cannot end this attendance session.'], 403);
        }

        DB::transaction(function () use ($lectureSession) {
            $lockedSession = LectureSession::query()->lockForUpdate()->findOrFail($lectureSession->id);
            $lockedSession->forceFill([
                'status' => 'ended',
                'ended_at' => now(),
            ])->save();
            $this->automaticAbsences->recordForEndedSession($lockedSession);
        });

        return response()->json([
            'message' => 'Lecture attendance session ended.',
            'session' => $this->sessionPayload($lectureSession->fresh()),
        ]);
    }

    public function closeAll(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'doctor', 'staff'], true)) {
            return response()->json(['message' => 'Only staff accounts can close attendance sessions.'], 403);
        }

        $termCode = $request->header('X-Academic-Term') ?: AcademicTerm::getActiveTermCode();
        $query = LectureSession::query()
            ->where('term_code', $termCode)
            ->where('status', 'active')
            ->whereNotIn('id', AdHocAttendanceSession::query()
                ->select('linked_lecture_session_id')
                ->where('status', '!=', 'migrated')
                ->whereNotNull('linked_lecture_session_id'));

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        $sessionIds = $query->pluck('id');
        $closedCount = DB::transaction(function () use ($sessionIds) {
            $sessions = LectureSession::query()
                ->whereIn('id', $sessionIds)
                ->where('status', 'active')
                ->lockForUpdate()
                ->get();
            $closedAt = now();

            foreach ($sessions as $session) {
                $session->forceFill([
                    'status' => 'ended',
                    'ended_at' => $closedAt,
                ])->save();
                $this->automaticAbsences->recordForEndedSession($session);
            }

            return $sessions->count();
        });

        return response()->json([
            'message' => 'All open attendance sessions were closed.',
            'closedCount' => $closedCount,
        ]);
    }

    public function destroy(Request $request, LectureSession $lectureSession): JsonResponse
    {
        $user = $request->user();

        if ($lectureSession->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['message' => 'You cannot delete this attendance session.'], 403);
        }

        if ($lectureSession->status === 'active') {
            return response()->json(['message' => 'End the active attendance session before deleting it.'], 409);
        }

        $lectureSession->delete();

        return response()->json(['message' => 'Attendance session deleted.']);
    }

    private function issueQrPayload(LectureSession $session, int $windowSeconds): array
    {
        $issued = $this->qrTokens->issuePair('lecture', (string) $session->id, $windowSeconds);

        return [
            'qrPayload' => $issued['qrPayload'],
            'sessionCode' => $issued['sessionCode'],
            'serverTime' => $issued['issuedAt']->toISOString(),
            'qrExpiresAt' => $issued['expiresAt']->toISOString(),
            'qrWindowSeconds' => $windowSeconds,
        ];
    }

    private function sessionPayload(LectureSession $session, bool $includeRecords = true): array
    {
        return [
            'id' => $session->id,
            'courseCode' => $session->course_code,
            'subjectName' => $this->subjectName($session),
            'lectureType' => $session->lecture_type,
            'group' => $session->group,
            'week' => $session->week,
            'allowAllGroups' => (bool) $session->allow_all_groups,
            'status' => $session->status,
            'startedAt' => optional($session->started_at)->toISOString(),
            'endedAt' => optional($session->ended_at)->toISOString(),
            'qrTokenExpiresAt' => optional($session->qr_token_expires_at)->toISOString(),
            'recordCount' => (int) ($session->record_count ?? $session->attendanceRecords()->count()),
            'recordsLoaded' => $includeRecords,
            'records' => $includeRecords ? $session->attendanceRecords
                ->sortByDesc(fn ($record) => optional($record->scanned_at)->timestamp ?? $record->id)
                ->values()
                ->map(fn ($record) => [
                    'id' => $record->id,
                    'studentId' => $record->student_id,
                    'studentName' => $record->student?->full_name ?: $record->student?->name ?: $record->student?->email ?: 'Unknown Student',
                    'studentUniversityId' => $record->student?->university_id ?: $record->student?->student_id ?: $record->student?->id,
                    'scannedAt' => optional($record->scanned_at)->toISOString(),
                ])->all() : [],
        ];
    }

    private function subjectName(LectureSession $session): string
    {
        $termCode = $session->term_code ?: AcademicTerm::getActiveTermCode();
        $courseCode = $this->normalizeCode($session->course_code);
        $key = $termCode.'|'.$courseCode;
        if (array_key_exists($key, $this->subjectNameCache)) {
            return $this->subjectNameCache[$key];
        }
        $name = CatalogSubject::query()
            ->where('term_code', $termCode)
            ->whereRaw('UPPER(subject_code) = ?', [$courseCode])
            ->value('subject_name');
        $name ??= CourseAssignment::query()
            ->where('term_code', $termCode)
            ->whereRaw('UPPER(course_id) = ?', [$courseCode])
            ->value('name');

        return trim((string) $name) ?: $session->course_code;
    }

    private function primeSubjectNames($sessions): void
    {
        foreach ($sessions->groupBy('term_code') as $termCode => $termSessions) {
            $termCode = $termCode ?: AcademicTerm::getActiveTermCode();
            $codes = $termSessions->pluck('course_code')->map(fn ($code) => $this->normalizeCode($code))->unique()->values();
            if ($codes->isEmpty()) {
                continue;
            }
            $placeholders = implode(',', array_fill(0, $codes->count(), '?'));
            $catalog = CatalogSubject::query()->where('term_code', $termCode)
                ->whereRaw("UPPER(subject_code) IN ({$placeholders})", $codes->all())
                ->get(['subject_code', 'subject_name'])
                ->groupBy(fn ($subject) => $this->normalizeCode($subject->subject_code));
            $assignments = CourseAssignment::query()->where('term_code', $termCode)
                ->whereRaw("UPPER(course_id) IN ({$placeholders})", $codes->all())
                ->get(['course_id', 'name'])
                ->groupBy(fn ($course) => $this->normalizeCode($course->course_id));
            foreach ($codes as $code) {
                $name = $catalog->get($code)?->first()?->subject_name
                    ?? $assignments->get($code)?->first()?->name;
                $this->subjectNameCache[$termCode.'|'.$code] = trim((string) $name) ?: $code;
            }
        }
    }

    private function generateQrToken(string $prefix): string
    {
        return $prefix.'-'.Str::upper(Str::random(10));
    }

    private function normalizeCode(string $value): string
    {
        return Str::upper(trim($value));
    }

    private function normalizeWeek(string $value): string
    {
        preg_match('/\d+/', $value, $matches);

        return isset($matches[0]) ? (string) ((int) $matches[0]) : $this->normalizeCode($value);
    }

    private function mergeDuplicateMainSessions(?string $termCode, ?string $userId): void
    {
        DB::transaction(function () use ($termCode, $userId): void {
            $flexibleLectureIds = AdHocAttendanceSession::query()
                ->where('status', '!=', 'migrated')
                ->whereNotNull('linked_lecture_session_id')
                ->pluck('linked_lecture_session_id');

            $sessions = LectureSession::query()
                ->when($termCode, fn ($query) => $query->where('term_code', $termCode))
                ->when($userId, fn ($query) => $query->where('user_id', $userId))
                ->when($flexibleLectureIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $flexibleLectureIds))
                ->oldest('started_at')
                ->oldest('created_at')
                ->lockForUpdate()
                ->get();

            $groups = $sessions->groupBy(fn (LectureSession $session) => implode('|', [
                $session->user_id,
                $this->normalizeCode((string) $session->term_code),
                $this->normalizeCode($session->course_code),
                $this->normalizeCode($session->lecture_type),
                $this->normalizeCode($session->group),
                $this->normalizeWeek($session->week),
            ]));

            foreach ($groups as $duplicates) {
                if ($duplicates->count() < 2) continue;

                /** @var LectureSession $canonical */
                $canonical = $duplicates->first();
                $activeSession = $duplicates->first(fn (LectureSession $session) => $session->status === 'active');

                foreach ($duplicates->slice(1) as $duplicate) {
                    foreach ($duplicate->attendanceRecords()->get() as $record) {
                        $alreadyPresent = $canonical->attendanceRecords()
                            ->where('student_id', $record->student_id)
                            ->exists();

                        if ($alreadyPresent) {
                            $record->delete();
                        } else {
                            $record->forceFill(['lecture_session_id' => $canonical->id])->save();
                        }
                    }

                    AdHocAttendanceSession::query()
                        ->where('linked_lecture_session_id', $duplicate->id)
                        ->update(['linked_lecture_session_id' => $canonical->id]);
                    $duplicate->delete();
                }

                $updates = [
                    'course_code' => $this->normalizeCode($canonical->course_code),
                    'lecture_type' => trim($canonical->lecture_type),
                    'group' => $this->normalizeCode($canonical->group),
                    'week' => $this->normalizeWeek($canonical->week),
                ];

                if ($activeSession) {
                    $updates = array_merge($updates, [
                        'status' => 'active',
                        'ended_at' => null,
                        'qr_token' => $activeSession->qr_token,
                        'qr_token_expires_at' => $activeSession->qr_token_expires_at,
                    ]);
                }

                $canonical->forceFill($updates)->save();
            }
        });
    }

    private function normalizeText(string $value): string
    {
        return trim($value);
    }
}
