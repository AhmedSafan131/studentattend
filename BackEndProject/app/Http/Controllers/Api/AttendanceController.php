<?php

namespace App\Http\Controllers\Api;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AcademicTerm;
use App\Models\AdHocAttendanceRecord;
use App\Models\AdHocAttendanceSession;
use App\Models\AdministrativeSubjectAbsence;
use App\Models\AttendanceRecord;
use App\Models\CatalogSubject;
use App\Models\CourseAssignment;
use App\Models\LectureSession;
use App\Models\User;
use App\Services\Attendance\AutomaticAbsenceService;
use App\Services\Attendance\AttendanceQrTokenService;
use App\Services\Attendance\FlexibleSessionExpiryService;
use App\Support\FlexibleAttendanceRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceQrTokenService $qrTokens,
        private readonly FlexibleSessionExpiryService $sessionExpiry,
    ) {}

    public function serverTime(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'student') {
            return response()->json(['message' => 'Only student accounts can synchronize scan time.'], 403);
        }

        return response()->json(['serverTime' => now()->toISOString()]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'doctor', 'staff'], true)) {
            return response()->json(['message' => 'Only staff accounts can view attendance records.'], 403);
        }

        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code');

        $query = AttendanceRecord::query()
            ->with(['lectureSession', 'student'])
            ->when($termCode, fn ($q) => $q->where('term_code', $termCode))
            ->latest('scanned_at');

        if ($user->role !== 'admin') {
            $query->whereHas('lectureSession', fn ($sessionQuery) => $sessionQuery->where('user_id', $user->id));
        }

        return response()->json([
            'data' => $query->get()->map(fn (AttendanceRecord $record) => $this->attendancePayload($record)),
        ]);
    }

    public function report(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'doctor', 'staff'], true)) {
            return response()->json(['message' => 'Only staff accounts can generate attendance reports.'], 403);
        }

        $data = $request->validate([
            'courseCode' => ['nullable', 'string', 'max:50'],
            'lectureType' => ['nullable', 'string', 'in:Lecture,Section,Practical'],
            'group' => ['nullable', 'string', 'max:50'],
            'week' => ['nullable', 'string', 'max:50'],
            'colleges' => ['nullable', 'array', 'max:100'],
            'colleges.*' => ['string', 'max:255'],
            'ignoreRegistration' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:500'],
            'search' => ['nullable', 'string', 'max:100'],
            'paginateRows' => ['nullable', 'boolean'],
        ]);
        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: AcademicTerm::getActiveTermCode();
        $courseCode = isset($data['courseCode']) ? $this->normalizeCode($data['courseCode']) : null;
        $lectureType = $data['lectureType'] ?? null;
        $group = isset($data['group']) ? $this->normalizeGroup($data['group']) : null;
        $week = isset($data['week']) ? $this->normalizeWeek($data['week']) : null;
        $ignoreRegistration = (bool) ($data['ignoreRegistration'] ?? false);
        $page = (int) ($data['page'] ?? 1);
        $perPage = (int) ($data['perPage'] ?? 50);
        $search = trim((string) ($data['search'] ?? ''));
        $paginateRows = (bool) ($data['paginateRows'] ?? false);
        $colleges = collect($data['colleges'] ?? [])->map(fn ($college) => trim($college))->filter()->unique()->values();

        $allowedCourseCodes = collect();
        if ($user->role !== 'admin') {
            $allowedCourseCodes = $user->courses()
                ->where('term_code', $termCode)
                ->pluck('course_id')
                ->map(fn ($code) => $this->normalizeCode($code))
                ->filter()
                ->unique()
                ->values();

            if ($courseCode && ! $allowedCourseCodes->contains($courseCode)) {
                return response()->json(['message' => 'You cannot generate a report for this course.'], 403);
            }
        }

        $sessionsQuery = LectureSession::query()
            ->where('term_code', $termCode)
            // The student history includes attendance on linked flexible sessions and
            // sessions still marked active. Never silently discard those real scans.
            ->where(fn ($query) => $query->where('status', 'ended')->orWhereHas('attendanceRecords'))
            ->whereRaw("TRIM(COALESCE(course_code, '')) NOT IN ('', '.')")
            ->when($courseCode, fn ($query) => $query->where('course_code', $courseCode))
            ->when($lectureType, fn ($query) => $query->where('lecture_type', $lectureType))
            ->when($group, fn ($query) => $query->where('group', $group))
            ->when($week, fn ($query) => $query->where('week', $week))
            ->when($user->role !== 'admin', fn ($query) => $query->whereIn('course_code', $allowedCourseCodes));
        $sessions = $sessionsQuery
            ->get(['id', 'course_code', 'lecture_type', 'group', 'week', 'status', 'started_at']);
        $sessionIds = $sessions->pluck('id');

        $registrationScope = function ($query) use ($termCode, $courseCode, $allowedCourseCodes, $user) {
            $query->where('term_code', $termCode)
                ->whereRaw("TRIM(COALESCE(subject_code, '')) NOT IN ('', '.')")
                ->when($courseCode, fn ($registrationQuery) => $registrationQuery->where('subject_code', $courseCode))
                ->when($user->role !== 'admin', fn ($registrationQuery) => $registrationQuery->whereIn('subject_code', $allowedCourseCodes));
        };
        $registrationMatchScope = function ($query) use ($registrationScope, $lectureType, $group) {
            $registrationScope($query);
            $query->when($lectureType, fn ($registrationQuery) => $registrationQuery->where('type', $lectureType))
                ->when($group, fn ($registrationQuery) => $registrationQuery->where('group', $group));
        };

        $studentsQuery = User::query()
            ->where('role', 'student')
            ->where(function ($query) {
                $numericId = DB::connection()->getDriverName() === 'sqlite'
                    ? "(TRIM(student_id) GLOB '[0-9]*' AND TRIM(student_id) NOT GLOB '*[^0-9]*')"
                    : "TRIM(student_id) REGEXP '^[0-9]+$'";
                $numericUniversityId = DB::connection()->getDriverName() === 'sqlite'
                    ? "(TRIM(university_id) GLOB '[0-9]*' AND TRIM(university_id) NOT GLOB '*[^0-9]*')"
                    : "TRIM(university_id) REGEXP '^[0-9]+$'";
                $query->whereRaw($numericId)->orWhereRaw($numericUniversityId);
            })
            ->where(function ($query) {
                foreach (['id', 'name', 'full_name', 'email', 'student_id', 'university_id'] as $column) {
                    $query->where(fn ($columnQuery) => $columnQuery
                        ->whereNull($column)
                        ->orWhere($column, 'not like', '%demo%'));
                }
            })
            ->when($colleges->isNotEmpty(), fn ($query) => $query->whereIn('college', $colleges))
            ->when($search !== '', function ($query) use ($search, $termCode) {
                $pattern = '%'.addcslashes($search, '%_\\').'%';
                $query->where(function ($studentQuery) use ($pattern, $termCode) {
                    foreach (['name', 'full_name', 'student_id', 'university_id', 'college'] as $column) {
                        $studentQuery->orWhere($column, 'like', $pattern);
                    }
                    $studentQuery->orWhereHas('registrations', fn ($registrations) => $registrations
                        ->where('term_code', $termCode)
                        ->where(function ($subjects) use ($pattern) {
                            $subjects->where('subject_code', 'like', $pattern)
                                ->orWhere('subject_name', 'like', $pattern);
                        }));
                });
            });
        $reportableStudentsQuery = clone $studentsQuery;
        $studentsQuery
            ->where(function ($query) use ($registrationMatchScope, $ignoreRegistration, $sessionIds) {
                $query->whereHas('registrations', $registrationMatchScope);

                // In this mode, retain students who attended a selected session
                // even if they have no matching registration.
                if ($ignoreRegistration && $sessionIds->isNotEmpty()) {
                    $query->orWhereHas('attendanceRecords', fn ($records) => $records->whereIn('lecture_session_id', $sessionIds));
                }
            })
            ->with(['registrations' => $registrationScope]);

        if ($paginateRows) {
            // One table row is one student/course pair, not one student. Paginating
            // students made pages contain an unpredictable number of report rows.
            $eligibleStudents = (clone $reportableStudentsQuery)->select('users.id');
            $registeredKeys = DB::table('users')
                ->join('student_registrations as sr', 'sr.user_id', '=', 'users.id')
                ->whereIn('users.id', $eligibleStudents)
                ->where('sr.term_code', $termCode)
                ->whereRaw("TRIM(COALESCE(sr.subject_code, '')) NOT IN ('', '.')")
                ->whereIn('sr.type', ['Lecture', 'Section', 'Practical'])
                ->whereRaw("TRIM(COALESCE(sr.`group`, '')) != ''")
                ->when($courseCode, fn ($query) => $query->where('sr.subject_code', $courseCode))
                ->when($user->role !== 'admin', fn ($query) => $query->whereIn('sr.subject_code', $allowedCourseCodes))
                ->when($lectureType, fn ($query) => $query->where('sr.type', $lectureType))
                ->when($group, fn ($query) => $query->where('sr.group', $group))
                ->when($search !== '', function ($query) use ($search) {
                    $pattern = '%'.addcslashes($search, '%_\\').'%';
                    $query->where(fn ($match) => $match
                        ->where('users.full_name', 'like', $pattern)
                        ->orWhere('users.name', 'like', $pattern)
                        ->orWhere('users.student_id', 'like', $pattern)
                        ->orWhere('users.university_id', 'like', $pattern)
                        ->orWhere('users.college', 'like', $pattern)
                        ->orWhere('sr.subject_code', 'like', $pattern)
                        ->orWhere('sr.subject_name', 'like', $pattern));
                })
                ->select('users.id as student_db_id', 'sr.subject_code as course_code', 'users.college', 'users.full_name')
                ->distinct();

            if ($ignoreRegistration && $sessionIds->isNotEmpty()) {
                $attendedKeys = DB::table('users')
                    ->join('attendance_records as ar', 'ar.student_id', '=', 'users.id')
                    ->join('lecture_sessions as ls', 'ls.id', '=', 'ar.lecture_session_id')
                    ->whereIn('users.id', (clone $reportableStudentsQuery)->select('users.id'))
                    ->whereIn('ar.lecture_session_id', $sessionIds)
                    ->when($search !== '', function ($query) use ($search) {
                        $pattern = '%'.addcslashes($search, '%_\\').'%';
                        $query->where(fn ($match) => $match
                            ->where('users.full_name', 'like', $pattern)
                            ->orWhere('users.name', 'like', $pattern)
                            ->orWhere('users.student_id', 'like', $pattern)
                            ->orWhere('users.university_id', 'like', $pattern)
                            ->orWhere('users.college', 'like', $pattern)
                            ->orWhere('ls.course_code', 'like', $pattern));
                    })
                    ->select('users.id as student_db_id', 'ls.course_code as course_code', 'users.college', 'users.full_name')
                    ->distinct();
                $registeredKeys->union($attendedKeys);
            }

            $rowCountKey = 'attendance-report-rows:'.sha1(json_encode([
                $termCode, $courseCode, $lectureType, $group, $week, $colleges->all(),
                $ignoreRegistration, $search, $user->id, $allowedCourseCodes->all(),
            ]));
            $totalRowKeys = Cache::remember($rowCountKey, now()->addMinute(),
                fn () => DB::query()->fromSub(clone $registeredKeys, 'report_row_keys')->count());
            $rowItems = DB::query()->fromSub($registeredKeys, 'report_row_keys')
                ->orderBy('college')->orderBy('course_code')->orderBy('full_name')->orderBy('student_db_id')
                ->offset(($page - 1) * $perPage)->limit($perPage)
                ->get(['student_db_id', 'course_code']);
            $rowPage = new LengthAwarePaginator($rowItems, $totalRowKeys, $perPage, $page);
            $selectedRowKeys = $rowPage->getCollection()
                ->mapWithKeys(fn ($key) => [$key->student_db_id.'__'.$this->normalizeCode($key->course_code) => true]);
            $students = User::query()
                ->whereIn('id', $rowPage->getCollection()->pluck('student_db_id')->unique())
                ->with(['registrations' => $registrationScope])
                ->get(['id', 'name', 'full_name', 'student_id', 'university_id', 'college']);
            $totalStudents = $students->count();
        } else {
            $studentPage = $studentsQuery
                ->orderBy('college')->orderBy('full_name')->orderBy('id')
                ->paginate($perPage, ['id', 'name', 'full_name', 'student_id', 'university_id', 'college'], 'page', $page);
            $students = $studentPage->getCollection()
                ->filter(fn (User $student) => $this->isReportableStudent($student))
                ->values();
            $totalStudents = $studentPage->total();
        }
        $studentIds = $students->pluck('id');
        $attendanceRecords = $sessionIds->isEmpty() || $studentIds->isEmpty()
            ? collect()
            : AttendanceRecord::query()
                ->whereIn('lecture_session_id', $sessionIds)
                ->whereIn('student_id', $studentIds)
                ->get(['lecture_session_id', 'student_id']);

        // The catalog is the authoritative course-code-to-name source. Uploaded
        // registrations can contain the course code in their subject_name field.
        $courseNames = [];
        $catalogSubjects = CatalogSubject::query()
            ->where(function ($query) use ($termCode) {
                $query->where('term_code', $termCode)->orWhereNull('term_code');
            })
            ->whereRaw("TRIM(COALESCE(subject_code, '')) NOT IN ('', '.')")
            ->orderByRaw('CASE WHEN term_code = ? THEN 0 ELSE 1 END', [$termCode])
            ->get(['subject_code', 'subject_name']);

        foreach ($catalogSubjects as $catalogSubject) {
            $catalogCourseCode = $this->normalizeCode($catalogSubject->subject_code);
            $catalogCourseName = trim((string) $catalogSubject->subject_name);

            if ($catalogCourseCode && $catalogCourseName !== ''
                && $this->normalizeCode($catalogCourseName) !== $catalogCourseCode) {
                $courseNames[$catalogCourseCode] ??= $catalogCourseName;
            }
        }

        foreach ($students as $student) {
            foreach ($student->registrations as $registration) {
                $registrationCourseCode = $this->normalizeCode($registration->subject_code);
                $registrationCourseName = trim((string) $registration->subject_name);

                if ($registrationCourseCode && $registrationCourseCode !== '.'
                    && $registrationCourseName !== ''
                    && $this->normalizeCode($registrationCourseName) !== $registrationCourseCode) {
                    $courseNames[$registrationCourseCode] ??= $registrationCourseName;
                }
            }
        }

        $sessionOccurrences = $this->buildAttendanceReportSessionOccurrences($sessions);

        $rows = $this->buildAttendanceReportRows(
            $students,
            $sessionOccurrences,
            $attendanceRecords,
            $courseCode,
            $lectureType,
            $group,
            $ignoreRegistration,
            $courseNames,
            $paginateRows ? $selectedRowKeys->all() : null,
        );
        if ($search !== '' && ! $paginateRows) {
            $rows = array_values(array_filter($rows, fn (array $row) => collect([
                $row['studentId'], $row['studentName'], $row['college'], $row['courseCode'], $row['courseName'],
            ])->contains(fn ($value) => mb_stripos((string) $value, $search) !== false)));
        }

        return response()->json([
            'meta' => [
                'termCode' => $termCode,
                'totalSessions' => count($sessionOccurrences['items']),
                'totalStudents' => $totalStudents ?? $students->count(),
                'totalRows' => count($rows),
                'presentRecords' => $sessionIds->isEmpty() ? 0 : AttendanceRecord::query()->whereIn('lecture_session_id', $sessionIds)->count(),
                'pagination' => [
                    'page' => $paginateRows ? $rowPage->currentPage() : $studentPage->currentPage(),
                    'perPage' => $paginateRows ? $rowPage->perPage() : $studentPage->perPage(),
                    'lastPage' => $paginateRows ? $rowPage->lastPage() : $studentPage->lastPage(),
                    'totalRows' => $paginateRows ? $rowPage->total() : null,
                    'totalStudents' => $totalStudents ?? $students->count(),
                ],
                'filters' => [
                    'courseCode' => $courseCode,
                    'lectureType' => $lectureType,
                    'group' => $group,
                    'week' => $week,
                    'colleges' => $colleges->values(),
                    'ignoreRegistration' => $ignoreRegistration,
                ],
            ],
            'rows' => $rows,
        ]);
    }

    public function reportOptions(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['admin', 'doctor', 'staff'], true)) {
            return response()->json(['message' => 'Only staff accounts can view report options.'], 403);
        }

        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: AcademicTerm::getActiveTermCode();
        $registrations = DB::table('student_registrations')
            ->join('users', 'users.id', '=', 'student_registrations.user_id')
            ->where('users.role', 'student')
            ->where('student_registrations.term_code', $termCode)
            ->whereNotNull('student_registrations.subject_code')
            ->whereNotIn('student_registrations.subject_code', ['', '.'])
            ->when($user->role !== 'admin', function ($query) use ($user, $termCode) {
                $query->whereIn('student_registrations.subject_code', $user->courses()
                    ->where('term_code', $termCode)
                    ->select('course_id'));
            })
            ->distinct()
            ->get([
                'users.college',
                'student_registrations.subject_code',
                'student_registrations.subject_name',
                'student_registrations.type',
                'student_registrations.group',
            ]);

        $colleges = [];
        foreach ($registrations as $registration) {
            $college = (string) $registration->college;
            $colleges[$college]['college'] = $college;
            $colleges[$college]['registrations'][] = [
                'subjectCode' => $registration->subject_code,
                'subjectName' => $registration->subject_name,
                'type' => $registration->type,
                'group' => $registration->group,
            ];
        }

        return response()->json(['data' => array_values($colleges)]);
    }

    public function scan(Request $request): JsonResponse
    {
        $student = $request->user();

        if ($student->role !== 'student') {
            return response()->json(['message' => 'Only student accounts can scan attendance QR codes.'], 403);
        }

        $scanMetadata = $request->validate([
            'scanRequestId' => ['nullable', 'uuid'],
            'queued' => ['nullable', 'boolean'],
            'scannedAt' => ['nullable', 'date'],
            'sessionCode' => ['nullable', 'string', 'regex:/^\d{4}(?:\d{2})?$/'],
        ]);
        $scanRequestId = $scanMetadata['scanRequestId'] ?? (string) Str::uuid();
        $isQueuedScan = (bool) ($scanMetadata['queued'] ?? false);
        if ($isQueuedScan && empty($scanMetadata['scannedAt'])) {
            return response()->json([
                'message' => 'A saved attendance scan must include its original scan time.',
                'errorCode' => 'MISSING_OFFLINE_SCAN_TIME',
            ], 422);
        }
        // A mobile connection can lose the HTTP response after the transaction
        // commits. Replaying the same request must return the committed record
        // without requiring the short-lived QR token to still be current.
        $confirmedScan = $this->findConfirmedScan($student, $scanRequestId);
        if ($confirmedScan) return response()->json($confirmedScan);

        $sessionCode = trim((string) ($scanMetadata['sessionCode'] ?? ''));
        $codeRateLimitKey = 'attendance-code:'.$student->id.':'.$request->ip();
        if ($sessionCode !== '' && RateLimiter::tooManyAttempts($codeRateLimitKey, 15)) {
            return response()->json([
                'message' => 'Too many incorrect session code attempts. Please wait before trying again.',
                'errorCode' => 'SESSION_CODE_RATE_LIMITED',
                'retryAfter' => RateLimiter::availableIn($codeRateLimitKey),
            ], 429);
        }

        $payload = $this->payloadFromRequest($request);
        $qrToken = $this->payloadToken($payload);
        $signedQr = null;

        if ($isQueuedScan) {
            $offlineServerNow = now();
            $offlineGraceHours = max(0, (int) config('attendance.offline_sync_max_hours', 24));

            if ($sessionCode !== '') {
                $proofs = collect($this->qrTokens->resolveOfflineAccessCodeProofs($sessionCode));
                $eligibleProofs = $proofs
                    ->filter(fn (array $proof) => $this->offlineProofIsWithinGrace(
                        $proof,
                        $offlineServerNow,
                        $offlineGraceHours,
                    ))
                    ->values();

                if ($eligibleProofs->isEmpty()) {
                    RateLimiter::hit($codeRateLimitKey, 60);
                    $proofExistsButIsTooOld = $proofs->contains(
                        fn (array $proof) => $this->offlineProofIsTooOld(
                            $proof,
                            $offlineServerNow,
                            $offlineGraceHours,
                        ),
                    );

                    return response()->json([
                        'message' => $proofExistsButIsTooOld
                            ? 'This saved attendance proof is too old to synchronize.'
                            : 'This saved session code cannot be verified by the server.',
                        'errorCode' => $proofExistsButIsTooOld ? 'OFFLINE_SCAN_TOO_OLD' : 'INVALID_OFFLINE_PROOF',
                    ], 422);
                }

                $sessionKeys = $eligibleProofs
                    ->map(fn (array $proof) => ($proof['kind'] ?? '').':'.($proof['sessionId'] ?? ''))
                    ->filter()
                    ->unique();
                if ($sessionKeys->count() !== 1) {
                    RateLimiter::hit($codeRateLimitKey, 60);

                    return response()->json([
                        'message' => 'This saved session code matches more than one attendance session and cannot be synchronized safely.',
                        'errorCode' => 'INVALID_OFFLINE_PROOF',
                    ], 422);
                }

                $signedQr = $eligibleProofs
                    ->sortByDesc(fn (array $proof) => (int) ($proof['issuedAt'] ?? 0))
                    ->first();
            } elseif ($qrToken) {
                $signedQr = $this->qrTokens->resolveOfflineProof($qrToken);
                if (! $signedQr) {
                    return response()->json([
                        'message' => 'This saved QR proof cannot be verified by the server.',
                        'errorCode' => 'INVALID_OFFLINE_PROOF',
                    ], 422);
                }

                if ($this->offlineProofIsTooOld($signedQr, $offlineServerNow, $offlineGraceHours)) {
                    return response()->json([
                        'message' => 'This saved attendance proof is too old to synchronize.',
                        'errorCode' => 'OFFLINE_SCAN_TOO_OLD',
                    ], 422);
                }

                if (! $this->offlineProofIsWithinGrace($signedQr, $offlineServerNow, $offlineGraceHours)) {
                    return response()->json([
                        'message' => 'This saved QR proof contains invalid server timing information.',
                        'errorCode' => 'INVALID_OFFLINE_PROOF',
                    ], 422);
                }
            } else {
                return response()->json([
                    'message' => 'A saved attendance scan requires a server-issued QR or session code proof.',
                    'errorCode' => 'INVALID_OFFLINE_PROOF',
                ], 422);
            }
        } else {
            $signedQr = $sessionCode !== ''
                ? $this->qrTokens->verifyAccessCode($sessionCode)
                : ($qrToken ? $this->qrTokens->verify($qrToken) : null);
        }

        if ($sessionCode !== '' && ! $signedQr) {
            RateLimiter::hit($codeRateLimitKey, 60);

            return response()->json([
                'message' => 'This session code is invalid or expired. Please enter the latest code from your instructor.',
                'errorCode' => 'INVALID_SESSION_CODE',
            ], 422);
        }
        if ($sessionCode !== '') {
            RateLimiter::clear($codeRateLimitKey);
        }
        $verifiedQueuedScan = $isQueuedScan && $signedQr !== null;
        $attendanceScannedAt = $verifiedQueuedScan
            ? Carbon::parse($signedQr['validFrom'])
            : now();
        $lectureSessionFromToken = ($signedQr['kind'] ?? null) === 'lecture'
            ? LectureSession::query()->whereKey($signedQr['sessionId'])->first()
            : ($qrToken ? $this->findActiveLectureSessionByToken($qrToken) : null);
        $flexSessionFromToken = ($signedQr['kind'] ?? null) === 'flexible'
            ? AdHocAttendanceSession::query()->whereKey($signedQr['sessionId'])->first()
            : ((! $lectureSessionFromToken && $qrToken) ? $this->findOpenFlexibleSessionByToken($qrToken) : null);
        $sessionId = $signedQr['sessionId'] ?? $this->payloadSessionId($payload);

        if ($flexSessionFromToken) {
            return $this->scanFlexibleSession(
                $student,
                $payload,
                $flexSessionFromToken->id,
                $scanRequestId,
                true,
                $verifiedQueuedScan,
                $attendanceScannedAt,
            );
        }

        if ($qrToken && ! $lectureSessionFromToken && ! $sessionId) {
            return response()->json([
                'message' => 'This QR code is invalid or expired. Please scan the latest QR from your instructor.',
                'errorCode' => $isQueuedScan ? 'INVALID_OFFLINE_PROOF' : 'INVALID_QR_PROOF',
            ], 422);
        }

        if (! $lectureSessionFromToken && ! $sessionId) {
            return response()->json([
                'message' => 'This QR code is not a valid attendance QR.',
                'errorCode' => $isQueuedScan ? 'INVALID_OFFLINE_PROOF' : 'INVALID_QR_PROOF',
            ], 422);
        }

        if (! $qrToken && $sessionId && $this->isFlexibleAttendancePayload($payload)) {
            return $this->scanFlexibleSession($student, $payload, $sessionId, $scanRequestId);
        }

        $session = $lectureSessionFromToken;
        if (! $session && ! $qrToken && $sessionId && $this->isFreshCompactPayload($payload, 'att')) {
            $session = LectureSession::query()->whereKey($sessionId)->where('status', 'active')->first();
        }

        if (! $session) {
            return response()->json([
                'message' => 'This attendance session was not found. Ask your instructor to refresh the QR.',
                'errorCode' => 'ATTENDANCE_SESSION_NOT_FOUND',
            ], 404);
        }

        if ($session->status !== 'active' && ! $verifiedQueuedScan) {
            return response()->json([
                'message' => 'This attendance session has ended.',
                'errorCode' => 'ATTENDANCE_SESSION_ENDED',
            ], 409);
        }

        if ($sessionCode === '' && ! $qrToken && ! $this->isFreshCompactPayload($payload, 'att')) {
            return response()->json(['message' => 'This QR code is from an unsupported older format. Please scan the latest QR from your instructor.'], 422);
        }

        if ($sessionCode === '' && ! $this->payloadMatchesSession($payload, $session)) {
            return response()->json([
                'message' => 'This QR data does not match the active attendance session. Please scan the latest QR.',
                'errorCode' => 'QR_SESSION_MISMATCH',
            ], 422);
        }

        $sessionTermCode = $session->term_code ?: AcademicTerm::getActiveTermCode();
        $termRegistrations = $student->registrations()
            ->where('term_code', $sessionTermCode)
            ->get();

        $subjectRegistration = $termRegistrations->first(fn ($registration) => (
            $this->same($registration->subject_code, $session->course_code)
        ));

        if (! $subjectRegistration) {
            $subjectName = $this->sessionSubjectName($session);
            return response()->json([
                'message' => "You are not enrolled in {$subjectName}.",
                'errorCode' => 'NOT_ENROLLED_IN_SUBJECT',
                'subjectName' => $subjectName,
                'session' => $this->sessionPayload($session),
            ], 403);
        }

        $matchingRegistration = $termRegistrations->first(fn ($registration) => (
            $this->same($registration->subject_code, $session->course_code)
            && $this->same($registration->type, $session->lecture_type)
            && $this->same($registration->group, $session->group)
        ));

        if (! $matchingRegistration && ! $session->allow_all_groups) {
            $subjectName = trim((string) $subjectRegistration->subject_name) ?: $this->sessionSubjectName($session);
            return response()->json([
                'message' => "You are enrolled in {$subjectName}, but not in {$session->lecture_type} group {$session->group}.",
                'errorCode' => 'WRONG_SUBJECT_GROUP',
                'subjectName' => $subjectName,
                'session' => $this->sessionPayload($session),
            ], 403);
        }

        $existingWeeklyRecord = $this->findExistingWeeklyAttendance($student, $session);

        if ($existingWeeklyRecord) {
            return response()->json([
                'message' => 'Attendance was already recorded for this subject in this week.',
                'alreadyRecorded' => true,
                'confirmed' => true,
                'attendance' => $this->attendancePayload($existingWeeklyRecord->fresh(['lectureSession', 'student'])),
                'session' => $this->sessionPayload($session),
            ]);
        }

        [$record, $weeklyDuplicate] = DB::transaction(function () use ($student, $session, $scanRequestId, $attendanceScannedAt) {
            User::query()->whereKey($student->id)->lockForUpdate()->firstOrFail();

            $existing = $this->findExistingWeeklyAttendance($student, $session);
            if ($existing) {
                return [$existing, true];
            }

            $record = AttendanceRecord::query()->create([
                'lecture_session_id' => $session->id,
                'student_id' => $student->id,
                'scan_request_id' => $scanRequestId,
                'course_code' => $session->course_code,
                'lecture_type' => $session->lecture_type,
                'group' => $session->group,
                'week' => $session->week,
                'term_code' => $session->term_code ?: AcademicTerm::getActiveTermCode(),
                'scanned_at' => $attendanceScannedAt,
            ]);

            AdministrativeSubjectAbsence::query()
                ->where('lecture_session_id', $session->id)
                ->where('student_id', $student->id)
                ->where('source', AutomaticAbsenceService::SOURCE)
                ->delete();

            return [$record, false];
        });

        if ($weeklyDuplicate) {
            return response()->json([
                'message' => 'Attendance was already recorded for this subject in this week.',
                'alreadyRecorded' => true,
                'confirmed' => true,
                'attendance' => $this->attendancePayload($record->fresh(['lectureSession', 'student'])),
                'session' => $this->sessionPayload($session),
            ]);
        }

        $message = $record->wasRecentlyCreated
            ? 'Attendance recorded successfully.'
            : 'Attendance was already recorded for this session.';

        return response()->json([
            'message' => $message,
            'confirmed' => true,
            'alreadyRecorded' => ! $record->wasRecentlyCreated,
            'attendance' => $this->attendancePayload($record->fresh(['lectureSession', 'student'])),
            'session' => $this->sessionPayload($session),
        ]);
    }

    public function scanStatus(Request $request): JsonResponse
    {
        $student = $request->user();
        if ($student->role !== 'student') {
            return response()->json(['message' => 'Only student accounts can verify attendance scans.'], 403);
        }

        $verification = $request->validate([
            'scanRequestId' => ['required', 'uuid'],
            'attendanceRecordId' => ['nullable', 'integer', 'min:1'],
            'recordSource' => ['nullable', 'in:official,flexible'],
        ]);
        $confirmedScan = $this->findConfirmedScan(
            $student,
            $verification['scanRequestId'],
            isset($verification['attendanceRecordId']) ? (int) $verification['attendanceRecordId'] : null,
            $verification['recordSource'] ?? null,
        );

        return $confirmedScan
            ? response()->json($confirmedScan)
            : response()->json(['confirmed' => false, 'scanRequestId' => $verification['scanRequestId']], 202);
    }

    private function scanFlexibleSession(
        User $student,
        array $payload,
        string $sessionId,
        string $scanRequestId,
        bool $skipPayloadValidation = false,
        bool $allowClosedHistoricalScan = false,
        ?CarbonInterface $effectiveScannedAt = null,
    ): JsonResponse
    {
        $session = AdHocAttendanceSession::query()->whereKey($sessionId)->first();

        if (! $session) {
            return response()->json([
                'message' => 'This flexible attendance session was not found. Ask your instructor to refresh the QR.',
                'errorCode' => 'ATTENDANCE_SESSION_NOT_FOUND',
            ], 404);
        }

        $this->sessionExpiry->expireIfDue($session);

        if ($session->status !== 'open' && ! $allowClosedHistoricalScan) {
            return response()->json([
                'message' => 'This flexible attendance session is not open.',
                'errorCode' => 'ATTENDANCE_SESSION_ENDED',
            ], 409);
        }

        if (! $skipPayloadValidation && (! $this->isFreshCompactPayload($payload, 'flex') || ! $this->payloadMatchesFlexibleSession($payload, $session))) {
            return response()->json([
                'message' => 'This QR data does not match the flexible attendance session. Please scan the latest QR.',
                'errorCode' => 'QR_SESSION_MISMATCH',
            ], 422);
        }

        if (! FlexibleAttendanceRegistration::studentIsEligible($session, $student)) {
            return response()->json([
                'message' => 'You are not registered in this subject.',
                'errorCode' => 'STUDENT_NOT_REGISTERED_IN_SUBJECT',
            ], 422);
        }

        $linkedLectureSession = $this->ensureFlexibleLectureSession($session);
        $existingWeeklyRecord = $this->findExistingWeeklyAttendance($student, $linkedLectureSession);

        if ($existingWeeklyRecord) {
            return response()->json([
                'message' => 'Attendance was already recorded for this subject in this week.',
                'alreadyRecorded' => true,
                'confirmed' => true,
                'attendance' => $this->attendancePayload($existingWeeklyRecord->fresh(['lectureSession', 'student'])),
                'session' => $this->flexibleSessionPayload($session->fresh()),
            ]);
        }

        [$record, $concurrentWeeklyRecord] = DB::transaction(function () use ($session, $student, $scanRequestId, $linkedLectureSession, $effectiveScannedAt) {
            User::query()->whereKey($student->id)->lockForUpdate()->firstOrFail();
            $existing = $this->findExistingWeeklyAttendance($student, $linkedLectureSession);
            if ($existing) {
                return [null, $existing];
            }

            $scannedAt = $effectiveScannedAt ?? now();

            $record = AdHocAttendanceRecord::query()->firstOrCreate(
                [
                    'ad_hoc_attendance_session_id' => $session->id,
                    'student_id' => $student->id,
                ],
                [
                    'scan_request_id' => $scanRequestId,
                    'scanned_at' => $scannedAt,
                ],
            );

            $this->syncFlexibleAttendanceToOfficialSession($session, $student, $record->scanned_at ?? $scannedAt);

            return [$record, null];
        });

        if ($concurrentWeeklyRecord) {
            return response()->json([
                'message' => 'Attendance was already recorded for this subject in this week.',
                'alreadyRecorded' => true,
                'confirmed' => true,
                'attendance' => $this->attendancePayload($concurrentWeeklyRecord->fresh(['lectureSession', 'student'])),
                'session' => $this->flexibleSessionPayload($session->fresh()),
            ]);
        }

        $message = $record->wasRecentlyCreated
            ? 'Flexible attendance recorded successfully.'
            : 'Flexible attendance was already recorded for this session.';

        return response()->json([
            'message' => $message,
            'confirmed' => true,
            'alreadyRecorded' => ! $record->wasRecentlyCreated,
            'attendance' => $this->flexibleAttendancePayload($record->fresh(['session', 'student'])),
            'session' => $this->flexibleSessionPayload($session),
        ]);
    }

    public function destroy(Request $request, AttendanceRecord $attendanceRecord): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'doctor', 'staff'], true)) {
            return response()->json(['message' => 'Only staff accounts can delete attendance records.'], 403);
        }

        $attendanceRecord->loadMissing('lectureSession');

        if ($user->role !== 'admin' && $attendanceRecord->lectureSession?->user_id !== $user->id) {
            return response()->json(['message' => 'You cannot delete attendance for another instructor session.'], 403);
        }

        $attendanceRecord->delete();

        return response()->json(null, 204);
    }

    public function destroyStudent(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'doctor', 'staff'], true)) {
            return response()->json(['message' => 'Only staff accounts can delete attendance records.'], 403);
        }

        $data = $request->validate([
            'studentId' => ['required', 'string'],
            'lectureSessionId' => ['nullable', 'string'],
            'courseCode' => ['required', 'string'],
            'lectureType' => ['required', 'string'],
            'group' => ['required', 'string'],
            'week' => ['required', 'string'],
        ]);

        $student = $this->findStudentByIdentifier($data['studentId']);

        if (! $student) {
            return response()->json(['message' => 'The selected student was not found.'], 404);
        }

        $courseCode = $this->normalizeCode($data['courseCode']);
        $lectureType = trim($data['lectureType']);
        $group = $this->normalizeGroup($data['group']);
        $legacyGroup = $this->normalizeCode($data['group']);
        $week = $this->normalizeWeek($data['week']);
        $legacyWeek = trim($data['week']);

        $query = AttendanceRecord::query()
            ->where('student_id', $student->id)
            ->where('course_code', $courseCode)
            ->where('lecture_type', $lectureType)
            ->whereIn('group', array_values(array_unique([$group, $legacyGroup])))
            ->whereIn('week', array_values(array_unique([$week, $legacyWeek])));

        if ($user->role !== 'admin') {
            $query->whereHas('lectureSession', fn ($sessionQuery) => $sessionQuery->where('user_id', $user->id));
        }

        $deleted = $query->delete();

        return response()->json([
            'deleted' => $deleted,
        ]);
    }

    public function storeManual(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'doctor', 'staff'], true)) {
            return response()->json(['message' => 'Only staff accounts can add attendance records.'], 403);
        }

        $data = $request->validate([
            'studentId' => ['required', 'string'],
            'lectureSessionId' => ['nullable', 'string'],
            'courseCode' => ['required', 'string'],
            'lectureType' => ['required', 'string'],
            'group' => ['required', 'string'],
            'week' => ['required', 'string'],
            'facultyId' => ['nullable', 'string', 'max:100'],
            'allowUnregistered' => ['nullable', 'boolean'],
        ]);

        $student = $this->findStudentByIdentifier($data['studentId']);

        if (! $student) {
            return response()->json(['message' => 'The selected student was not found.'], 404);
        }

        $courseCode = $this->normalizeCode($data['courseCode']);
        $lectureType = trim($data['lectureType']);
        $group = $this->normalizeGroup($data['group']);
        $week = $this->normalizeWeek($data['week']);
        $allowUnregistered = (bool) ($data['allowUnregistered'] ?? false);

        if ($allowUnregistered && $user->role !== 'admin') {
            return response()->json(['message' => 'Only administrators can override student subject registration.'], 403);
        }

        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: AcademicTerm::getActiveTermCode();
        $sessionQuery = LectureSession::query()
            ->where('course_code', $courseCode)
            ->where('lecture_type', $lectureType)
            ->where('group', $group)
            ->where('week', $week)
            ->where('term_code', $termCode)
            ->latest('started_at');

        if (! empty($data['lectureSessionId'])) {
            $sessionQuery->whereKey($data['lectureSessionId']);
        }

        if ($user->role !== 'admin') {
            $sessionQuery->where('user_id', $user->id);
        }

        $session = $sessionQuery->first();

        if (! $session && ! empty($data['lectureSessionId'])) {
            return response()->json(['message' => 'The selected attendance session was not found.'], 404);
        }

        $allowAllGroups = (bool) $session?->allow_all_groups;
        $studentRegistrations = $student->registrations()
            ->where('term_code', $termCode)
            ->get();
        $registered = $studentRegistrations
            ->contains(fn ($registration) => $this->same($registration->subject_code, $courseCode)
                && ($allowAllGroups || (
                    $this->same($registration->type, $lectureType)
                    && $this->same($registration->group, $group)
                )));

        if (! $registered && $allowUnregistered) {
            $facultyId = trim((string) ($data['facultyId'] ?? ''));
            $selectedSubject = CatalogSubject::query()
                ->where('faculty_id', $facultyId)
                ->whereRaw('UPPER(TRIM(subject_code)) = ?', [$courseCode])
                ->where(fn ($query) => $query->where('term_code', $termCode)->orWhereNull('term_code'))
                ->orderByRaw('CASE WHEN term_code = ? THEN 0 ELSE 1 END', [$termCode])
                ->first();

            if (! $selectedSubject) {
                return response()->json(['message' => 'The selected subject does not belong to the selected faculty.'], 422);
            }

            $registeredSubjectCodes = $studentRegistrations
                ->pluck('subject_code')
                ->map(fn ($code) => $this->normalizeCode($code))
                ->filter()
                ->values();
            $hasRegistrationInFaculty = $registeredSubjectCodes->isNotEmpty()
                && CatalogSubject::query()
                    ->where('faculty_id', $facultyId)
                    ->where(fn ($query) => $query->where('term_code', $termCode)->orWhereNull('term_code'))
                    ->whereIn(DB::raw('UPPER(TRIM(subject_code))'), $registeredSubjectCodes->all())
                    ->exists();
            $studentCollegeMatches = $this->same($student->college, $selectedSubject->faculty_id)
                || $this->same($student->college, $selectedSubject->faculty_name);

            if (! $studentCollegeMatches && ! $hasRegistrationInFaculty) {
                return response()->json(['message' => 'The student belongs to a different faculty.'], 422);
            }

            $registered = true;
        }

        if (! $registered) {
            return response()->json([
                'message' => $allowAllGroups
                    ? 'This student is not registered in the selected course.'
                    : 'This student is not registered in the selected course, type, and group.',
            ], 422);
        }

        if (! $session) {
            $session = LectureSession::query()->create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'course_code' => $courseCode,
                'lecture_type' => $lectureType,
                'group' => $group,
                'week' => $week,
                'status' => 'ended',
                'started_at' => now(),
                'ended_at' => now(),
                'term_code' => $termCode,
            ]);
        }

        $existingWeeklyRecord = $this->findExistingWeeklyAttendance($student, $session);
        if ($existingWeeklyRecord) {
            return response()->json([
                'message' => 'Attendance was already recorded for this subject in this week.',
                'attendance' => $this->attendancePayload($existingWeeklyRecord->fresh(['lectureSession', 'student'])),
            ]);
        }

        $record = AttendanceRecord::query()->updateOrCreate(
            [
                'lecture_session_id' => $session->id,
                'student_id' => $student->id,
            ],
            [
                'course_code' => $courseCode,
                'lecture_type' => $lectureType,
                'group' => $group,
                'week' => $week,
                'scanned_at' => now(),
                'term_code' => $termCode,
            ],
        );

        return response()->json([
            'message' => 'Attendance record saved.',
            'attendance' => $this->attendancePayload($record->fresh(['lectureSession', 'student'])),
        ], $record->wasRecentlyCreated ? 201 : 200);
    }

    public function mine(Request $request): JsonResponse
    {
        $student = $request->user();

        if ($student->role !== 'student') {
            return response()->json(['message' => 'Only student accounts can view student attendance.'], 403);
        }

        return $this->studentHistoryResponse($request, $student);
    }

    public function adminStudentView(Request $request): JsonResponse
    {
        if ($request->user()?->role !== 'admin') {
            return response()->json(['message' => 'Only administrators can view a student account preview.'], 403);
        }

        $data = $request->validate([
            'nationalId' => ['required', 'string', 'max:100'],
        ]);
        $nationalId = trim($data['nationalId']);
        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: AcademicTerm::getActiveTermCode();
        $student = User::query()
            ->where('role', 'student')
            ->where('national_id', $nationalId)
            ->first();

        if (! $student) {
            return response()->json(['message' => 'No student was found with this national ID.'], 404);
        }

        $student->load([
            'registrations' => fn ($query) => $query->where('term_code', $termCode),
        ]);
        $history = $this->studentHistoryResponse($request, $student)->getData(true);

        return response()->json([
            'termCode' => $termCode,
            'student' => (new UserResource($student))->resolve($request),
            'attendance' => $history['data'] ?? [],
        ])->header('Cache-Control', 'private, no-store, max-age=0');
    }

    private function studentHistoryResponse(Request $request, User $student): JsonResponse
    {
        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: AcademicTerm::getActiveTermCode();
        $registrations = $student->registrations()->where('term_code', $termCode)->get();
        $subjectNamesByCode = $registrations
            ->filter(fn ($registration) => trim((string) $registration->subject_code) !== '')
            ->mapWithKeys(fn ($registration) => [
                $this->normalizeCode($registration->subject_code) => trim((string) $registration->subject_name),
            ]);
        $visibleAbsenceRegistrationKeys = $registrations
            ->mapWithKeys(fn ($registration) => [
                implode('__', [
                    $this->normalizeCode($registration->subject_code),
                    $this->normalizeCode($registration->type),
                ]) => true,
            ]);
        $subjectNamesByLectureSession = AdHocAttendanceSession::query()
            ->whereNotNull('linked_lecture_session_id')
            ->where('term_code', $termCode)
            ->whereIn('linked_lecture_session_id', AttendanceRecord::query()
                ->select('lecture_session_id')->where('student_id', $student->id)->where('term_code', $termCode))
            ->get(['linked_lecture_session_id', 'subject_code', 'subject_name', 'migrated_to_course_code'])
            ->mapWithKeys(function (AdHocAttendanceSession $session) use ($subjectNamesByCode) {
                $courseCode = $session->migrated_to_course_code ?: $session->subject_code;
                $subjectName = $subjectNamesByCode->get($this->normalizeCode($courseCode))
                    ?: trim((string) $session->subject_name);

                return $subjectName === '' ? [] : [$session->linked_lecture_session_id => $subjectName];
            });

        $presentHistory = AttendanceRecord::query()
            ->with('lectureSession')
            ->where('student_id', $student->id)
            ->where('term_code', $termCode)
            ->latest('scanned_at')
            ->get()
            ->map(function (AttendanceRecord $record) use ($subjectNamesByCode, $subjectNamesByLectureSession) {
                $session = $record->lectureSession;
                // Registration changes must not relabel an old attendance record.
                // The session that was actually opened is the historical source.
                $group = $this->normalizeGroup($session?->group ?: $record->group);
                $week = $this->normalizeWeek($session?->week ?: $record->week);
                $lectureType = trim((string) ($session?->lecture_type ?: $record->lecture_type));
                $courseCode = $session?->course_code ?: $record->course_code;

                return [
                    'id' => $record->id,
                    'sessionId' => $session?->id ?: $record->lecture_session_id,
                    'course' => $courseCode,
                    'courseCode' => $courseCode,
                    'subjectName' => $subjectNamesByLectureSession->get($session?->id)
                        ?: $subjectNamesByCode->get($this->normalizeCode($courseCode)),
                    'type' => $lectureType,
                    'lectureType' => $lectureType,
                    'group' => $group,
                    'week' => $week,
                    'date' => optional($session?->started_at ?: $record->scanned_at)->format('Y-m-d') ?: '',
                    'time' => optional($record->scanned_at)->format('h:i:s A') ?: '-',
                    'status' => 'present',
                    'source' => 'attendance_record',
                    'startedAt' => optional($session?->started_at ?: $record->scanned_at)->toISOString(),
                    'scannedAt' => optional($record->scanned_at)->toISOString(),
                ];
            })
            ->groupBy(fn (array $record) => implode('__', [
                $this->normalizeCode($record['courseCode']),
                $this->normalizeCode($record['lectureType']),
                $this->normalizeWeek($record['week']),
            ]))
            ->map(fn ($records) => collect($records)
                ->sortBy(fn (array $record) => $record['scannedAt'] ?: $record['startedAt'] ?: '')
                ->first()
            );

        // Registration only describes which subjects the student is enrolled in.
        // An absence is an explicit attendance outcome and must come from the
        // administrative absence ledger, never be invented from enrollment alone.
        $absentHistory = AdministrativeSubjectAbsence::query()
            ->with('lectureSession')
            ->where('student_id', $student->id)
            ->where('term_code', $termCode)
            ->latest('created_at')
            ->get()
            ->mapWithKeys(function (AdministrativeSubjectAbsence $absence) use ($presentHistory, $subjectNamesByCode, $visibleAbsenceRegistrationKeys) {
                $registrationKey = implode('__', [
                    $this->normalizeCode($absence->subject_code),
                    $this->normalizeCode($absence->lecture_type),
                ]);

                if (! $visibleAbsenceRegistrationKeys->has($registrationKey)) {
                    return [];
                }

                $sessionKey = implode('__', [
                    $this->normalizeCode($absence->subject_code),
                    $this->normalizeCode($absence->lecture_type),
                    $this->normalizeWeek($absence->week),
                ]);

                if ($presentHistory->has($sessionKey)) {
                    return [];
                }

                $session = $absence->lectureSession;

                return [$sessionKey => [
                    'id' => 'absence-'.$absence->id,
                    'sessionId' => $session?->id,
                    'course' => $absence->subject_code,
                    'courseCode' => $absence->subject_code,
                    'subjectName' => trim((string) $absence->subject_name)
                        ?: $subjectNamesByCode->get($this->normalizeCode($absence->subject_code)),
                    'type' => $absence->lecture_type,
                    'lectureType' => $absence->lecture_type,
                    'group' => $this->normalizeGroup($absence->group),
                    'week' => $this->normalizeWeek($absence->week),
                    'date' => optional($session?->started_at ?: $absence->created_at)->format('Y-m-d') ?: '',
                    'time' => '-',
                    'status' => 'absent',
                    'source' => $absence->source === AutomaticAbsenceService::SOURCE
                        ? 'automatic_absence'
                        : 'administrative_absence',
                    'startedAt' => optional($session?->started_at ?: $absence->created_at)->toISOString(),
                    'scannedAt' => null,
                ]];
            });

        // Flexible scanning synchronizes an AttendanceRecord into its linked lecture
        // session. Prefer that canonical record in history and only keep legacy
        // flexible records when no official attendance record exists for them.
        $officialSessionIds = AttendanceRecord::query()
            ->where('student_id', $student->id)
            ->where('term_code', $termCode)
            ->pluck('lecture_session_id')
            ->filter()
            ->flip();

        $flexibleHistory = AdHocAttendanceRecord::query()
            ->with('session.linkedLectureSession')
            ->where('student_id', $student->id)
            ->whereHas('session', fn ($query) => $query->where('term_code', $termCode))
            ->latest('scanned_at')
            ->get()
            ->map(function (AdHocAttendanceRecord $record) use ($subjectNamesByCode) {
                $session = $record->session;
                $linkedSession = $session?->linkedLectureSession;
                $courseCode = $session?->migrated_to_course_code ?: $linkedSession?->course_code ?: $session?->subject_code ?: $session?->subject_name ?: 'Flexible';
                $week = $session?->migrated_to_week ?: $linkedSession?->week ?: $session?->week ?: 'Flexible';
                $lectureType = $session?->migrated_to_lecture_type ?: $linkedSession?->lecture_type ?: $session?->lecture_type ?: 'Flexible';
                $group = $session?->migrated_to_group ?: $linkedSession?->group ?: ($session?->group ?: '');

                return [
                    'id' => 'flex-'.$record->id,
                    'sessionId' => $session?->id ?: $record->ad_hoc_attendance_session_id,
                    'linkedLectureSessionId' => $session?->linked_lecture_session_id,
                    'course' => $courseCode,
                    'courseCode' => $courseCode,
                    // The student-sheet name is authoritative. Older flexible sessions
                    // can have the generated course code stored as subject_name.
                    'subjectName' => $subjectNamesByCode->get($this->normalizeCode($courseCode)) ?: $session?->subject_name,
                    'type' => $lectureType,
                    'lectureType' => $lectureType,
                    'group' => $group,
                    'week' => $week,
                    'date' => optional($session?->started_at ?: $record->scanned_at)->format('Y-m-d') ?: '',
                    'time' => optional($record->scanned_at)->format('h:i:s A') ?: '-',
                    'status' => 'present',
                    'source' => 'attendance_record',
                    'startedAt' => optional($session?->started_at ?: $record->scanned_at)->toISOString(),
                    'scannedAt' => optional($record->scanned_at)->toISOString(),
                    'isFlexible' => true,
                ];
            })
            ->reject(fn (array $record) => $record['linkedLectureSessionId']
                && $officialSessionIds->has($record['linkedLectureSessionId']))
            ->groupBy(fn (array $record) => implode('__', [
                $this->normalizeCode($record['courseCode']),
                $this->normalizeCode($record['lectureType']),
                $this->normalizeWeek($record['week']),
            ]))
            ->reject(fn ($records, string $sessionKey) => $presentHistory->has($sessionKey))
            ->map(fn ($records) => collect($records)
                ->sortBy(fn (array $record) => $record['scannedAt'] ?: $record['startedAt'] ?: '')
                ->first()
            );

        $history = $presentHistory
            ->values()
            ->concat($absentHistory->values())
            ->concat($flexibleHistory->values())
            ->sortByDesc(fn (array $record) => $record['scannedAt'] ?: $record['startedAt'] ?: '')
            ->values();

        return response()->json([
            'termCode' => $termCode,
            'data' => $history,
        ])->header('Cache-Control', 'private, no-store, max-age=0');
    }

    private function buildAttendanceReportSessionOccurrences($sessions): array
    {
        $classTypes = ['Lecture', 'Section', 'Practical'];
        $items = [];
        $sessionKeys = [];

        foreach ($sessions as $session) {
            $courseCode = $this->normalizeCode($session->course_code);
            $type = trim((string) $session->lecture_type);
            $group = $this->normalizeGroup($session->group);
            $week = $this->normalizeWeek($session->week);

            if (! $courseCode || $courseCode === '.' || ! in_array($type, $classTypes, true) || ! $group) {
                continue;
            }

            // Retried or migrated sessions can share a weekly occurrence. They represent
            // one attendance opportunity for the student's registered group.
            $key = implode('__', [$courseCode, $type, $group, $week !== '' ? "week-{$week}" : "session-{$session->id}"]);
            $sessionKeys[$session->id] = $key;
            $items[$key] ??= [
                'courseCode' => $courseCode,
                'type' => $type,
                'group' => $group,
                'week' => $week,
                'attendedOnly' => true,
            ];
            // An open session with scans is evidence of attendance, but not yet
            // evidence of absence for every other enrolled student.
            $items[$key]['attendedOnly'] = $items[$key]['attendedOnly'] && $session->status !== 'ended';
        }

        return [
            'items' => $items,
            'sessionKeys' => $sessionKeys,
        ];
    }

    private function buildAttendanceReportRows(
        $students,
        array $sessionOccurrences,
        $attendanceRecords,
        ?string $courseFilter,
        ?string $typeFilter,
        ?string $groupFilter,
        bool $ignoreRegistration,
        array $courseNames,
        ?array $selectedRowKeys = null,
    ): array {
        $classTypes = ['Lecture', 'Section', 'Practical'];
        $occurrences = $sessionOccurrences['items'];
        $sessionKeys = $sessionOccurrences['sessionKeys'];
        $sessionsByType = [];

        foreach ($occurrences as $occurrenceKey => $occurrence) {
            $sessionsByType[$occurrence['courseCode']][$occurrence['type']][$occurrence['group']][] = $occurrenceKey;
        }

        $studentsById = $students->keyBy('id');
        $attendanceByStudent = [];
        foreach ($attendanceRecords as $record) {
            $occurrenceKey = $sessionKeys[$record->lecture_session_id] ?? null;
            if ($occurrenceKey) {
                $attendanceByStudent[$record->student_id][$occurrenceKey] = true;
            }
        }

        $rows = [];
        foreach ($students as $student) {
            foreach ($student->registrations as $registration) {
                $courseCode = $this->normalizeCode($registration->subject_code);
                $type = trim((string) $registration->type);
                $group = $this->normalizeGroup($registration->group);

                if (! $courseCode || $courseCode === '.' || ! in_array($type, $classTypes, true) || ! $group
                    || ($courseFilter && $courseCode !== $courseFilter)
                    || ($typeFilter && $type !== $typeFilter)
                    || ($groupFilter && $group !== $groupFilter)) {
                    continue;
                }

                $key = $student->id.'__'.$courseCode;
                if (! isset($rows[$key])) {
                    $rows[$key] = $this->newAttendanceReportRow(
                        $student,
                        $courseCode,
                        $this->reportSubjectName($registration->subject_name, $courseNames[$courseCode] ?? null, $courseCode),
                        true,
                    );
                }

                $rows[$key]['groupsByType'][$type][$group] = true;
            }
        }

        // A student's registration contains only their current group. Preserve the
        // groups from attendance so group changes do not hide earlier weeks. When
        // registration is ignored, the same pass also creates rows for attendees
        // without a matching registration.
        foreach ($attendanceRecords as $record) {
            $occurrenceKey = $sessionKeys[$record->lecture_session_id] ?? null;
            $session = $occurrenceKey ? ($occurrences[$occurrenceKey] ?? null) : null;

            if (! $session) {
                continue;
            }

            $key = $record->student_id.'__'.$session['courseCode'];
            if ($ignoreRegistration && ! isset($rows[$key])) {
                $student = $studentsById->get($record->student_id);
                if (! $student) {
                    continue;
                }

                $rows[$key] = $this->newAttendanceReportRow(
                    $student,
                    $session['courseCode'],
                    $this->reportSubjectName(null, $courseNames[$session['courseCode']] ?? null, $session['courseCode']),
                    false,
                );
            }

            if (isset($rows[$key])) {
                $rows[$key]['groupsByType'][$session['type']][$session['group']] = true;
            }
        }

        if ($selectedRowKeys !== null) {
            $rows = array_intersect_key($rows, $selectedRowKeys);
        }

        foreach ($rows as &$row) {
            $studentAttendance = $attendanceByStudent[$row['internalStudentId']] ?? [];
            $overall = ['attended' => 0, 'total' => 0, 'absent' => 0];

            foreach ($classTypes as $type) {
                $occurrenceSlots = [];
                foreach (array_keys($row['groupsByType'][$type] ?? []) as $group) {
                    foreach ($sessionsByType[$row['courseCode']][$type][$group] ?? [] as $occurrenceKey) {
                        if (($occurrences[$occurrenceKey]['attendedOnly'] ?? false)
                            && ! isset($studentAttendance[$occurrenceKey])) {
                            continue;
                        }
                        $occurrenceWeek = $occurrences[$occurrenceKey]['week'] ?? '';
                        $slotKey = $occurrenceWeek !== '' ? 'week-'.$occurrenceWeek : $occurrenceKey;
                        // Groups can change mid-term. Count a week once across
                        // old/new groups, and count it present if either was attended.
                        $occurrenceSlots[$slotKey] = ($occurrenceSlots[$slotKey] ?? false)
                            || isset($studentAttendance[$occurrenceKey]);
                    }
                }

                $total = count($occurrenceSlots);
                $attended = 0;
                $weeks = [];
                foreach ($occurrenceSlots as $slotKey => $isAttended) {
                    if (! $isAttended) {
                        continue;
                    }

                    $attended++;
                    if (str_starts_with($slotKey, 'week-')) {
                        $weeks[substr($slotKey, 5)] = true;
                    }
                }
                $weeks = array_map('strval', array_keys($weeks));
                usort($weeks, fn ($left, $right) => (int) $left <=> (int) $right);
                $rate = $total ? round(($attended / $total) * 100, 2) : 0;

                $row['types'][$type] = [
                    'attended' => $attended,
                    'total' => $total,
                    'absent' => max(0, $total - $attended),
                    'weeks' => $weeks,
                    'rate' => $rate,
                ];
                $overall['attended'] += $attended;
                $overall['total'] += $total;
                $overall['absent'] += max(0, $total - $attended);
            }

            $overall['attendanceRate'] = $overall['total'] ? round(($overall['attended'] / $overall['total']) * 100, 2) : 0;
            $overall['absenceRate'] = $overall['total'] ? round(($overall['absent'] / $overall['total']) * 100, 2) : 0;
            $row['overall'] = $overall;
            $row['status'] = $overall['total'] === 0
                ? 'no_sessions'
                : ($overall['attendanceRate'] >= 75 ? 'regular' : ($overall['attendanceRate'] >= 50 ? 'warning' : 'at_risk'));
            unset($row['groupsByType'], $row['internalStudentId']);
        }
        unset($row);

        return collect($rows)
            ->sortBy(fn (array $row) => [$row['college'], $row['courseName'], $row['studentName'], $row['courseCode']])
            ->values()
            ->all();
    }

    private function isReportableStudent(User $student): bool
    {
        $studentId = trim((string) $student->student_id);
        $universityId = trim((string) $student->university_id);
        $hasAcademicNumber = preg_match('/^\d+$/', $studentId) === 1
            || preg_match('/^\d+$/', $universityId) === 1;
        $identity = strtolower(implode(' ', [
            $student->id,
            $student->name,
            $student->full_name,
            $student->email,
            $student->student_id,
            $student->university_id,
        ]));

        return $hasAcademicNumber && ! str_contains($identity, 'demo');
    }

    private function reportSubjectName(?string $candidate, ?string $fallback, string $courseCode): string
    {
        foreach ([$candidate, $fallback] as $name) {
            $name = trim((string) $name);
            if ($name !== '' && $name !== '.' && $this->normalizeCode($name) !== $courseCode) {
                return $name;
            }
        }

        return $courseCode;
    }

    private function newAttendanceReportRow(User $student, string $courseCode, ?string $subjectName, bool $isRegistered): array
    {
        return [
            'internalStudentId' => $student->id,
            'studentId' => $student->student_id ?: $student->university_id ?: $student->id,
            'studentName' => $student->full_name ?: $student->name ?: $student->email ?: 'Unknown Student',
            'college' => $student->college ?: '-',
            'courseCode' => $courseCode,
            'courseName' => trim((string) $subjectName) ?: $courseCode,
            'isRegistered' => $isRegistered,
            'groupsByType' => [],
            'types' => [],
            'overall' => [],
            'status' => 'no_sessions',
        ];
    }

    private function offlineProofIsWithinGrace(
        array $proof,
        CarbonInterface $serverNow,
        int $graceHours,
    ): bool
    {
        $window = $this->offlineProofWindow($proof);
        if (! $window) {
            return false;
        }

        [$validFrom, $validUntil] = $window;

        return $validFrom->lessThanOrEqualTo($serverNow->copy()->addSeconds(15))
            && $serverNow->lessThanOrEqualTo($validUntil->copy()->addHours($graceHours));
    }

    private function offlineProofIsTooOld(
        array $proof,
        CarbonInterface $serverNow,
        int $graceHours,
    ): bool
    {
        $window = $this->offlineProofWindow($proof);
        if (! $window) {
            return false;
        }

        [, $validUntil] = $window;

        return $serverNow->greaterThan($validUntil->copy()->addHours($graceHours));
    }

    /** @return array{0: CarbonInterface, 1: CarbonInterface}|null */
    private function offlineProofWindow(array $proof): ?array
    {
        if (empty($proof['validFrom']) || empty($proof['validUntil'])) {
            return null;
        }

        try {
            $validFrom = Carbon::parse($proof['validFrom']);
            $validUntil = Carbon::parse($proof['validUntil']);
        } catch (\Throwable) {
            return null;
        }

        return $validUntil->lessThan($validFrom) ? null : [$validFrom, $validUntil];
    }

    private function payloadFromRequest(Request $request): array
    {
        $payload = $request->input('qrPayload', $request->input('payload', []));

        if (is_string($payload)) {
            $decoded = json_decode($payload, true);
            return is_array($decoded) ? $decoded : ['qrToken' => trim($payload)];
        }

        return is_array($payload) ? $payload : [];
    }

    private function payloadToken(array $payload): ?string
    {
        $token = Arr::get($payload, 't')
            ?: Arr::get($payload, 'qrToken')
            ?: Arr::get($payload, 'token');

        return is_scalar($token) && trim((string) $token) !== ''
            ? trim((string) $token)
            : null;
    }

    private function payloadSessionId(array $payload): ?string
    {
        $sessionId = Arr::get($payload, 's')
            ?: Arr::get($payload, 'sessionId')
            ?: Arr::get($payload, 'lecture_id')
            ?: Arr::get($payload, 'lectureId');

        return is_scalar($sessionId) && trim((string) $sessionId) !== ''
            ? trim((string) $sessionId)
            : null;
    }

    private function findActiveLectureSessionByToken(string $token): ?LectureSession
    {
        return LectureSession::query()
            ->where('qr_token', $token)
            ->where('status', 'active')
            ->whereNotNull('qr_token_expires_at')
            ->where('qr_token_expires_at', '>=', now())
            ->first();
    }

    private function findOpenFlexibleSessionByToken(string $token): ?AdHocAttendanceSession
    {
        return AdHocAttendanceSession::query()
            ->where('qr_token', $token)
            ->where('status', 'open')
            ->whereNotNull('qr_token_expires_at')
            ->where('qr_token_expires_at', '>=', now())
            ->first();
    }

    private function payloadMatchesSession(array $payload, LectureSession $session): bool
    {
        $course = Arr::get($payload, 'courseCode') ?: Arr::get($payload, 'course') ?: Arr::get($payload, 'subjectCode');
        $type = Arr::get($payload, 'lectureType') ?: Arr::get($payload, 'type');
        $group = Arr::get($payload, 'group') ?: Arr::get($payload, 'section');
        $week = Arr::get($payload, 'week');

        return (! $course || $this->same($course, $session->course_code))
            && (! $type || $this->same($type, $session->lecture_type))
            && (! $group || $this->same($group, $session->group))
            && (! $week || $this->same($week, $session->week));
    }

    private function payloadMatchesFlexibleSession(array $payload, AdHocAttendanceSession $session): bool
    {
        $subjectCode = Arr::get($payload, 'subjectCode');
        $subjectName = Arr::get($payload, 'subjectName');
        $lectureType = Arr::get($payload, 'lectureType');
        $group = Arr::get($payload, 'group');
        $week = Arr::get($payload, 'week');
        $faculty = Arr::get($payload, 'faculty');

        return (! $subjectCode || ! $session->subject_code || $this->same($subjectCode, $session->subject_code))
            && (! $subjectName || $this->same($subjectName, $session->subject_name))
            && (! $lectureType || ! $session->lecture_type || $this->same($lectureType, $session->lecture_type))
            && (! $group || ! $session->group || $this->same($group, $session->group))
            && (! $week || ! $session->week || $this->same($week, $session->week))
            && (! $faculty || $this->same($faculty, $session->faculty));
    }

    private function isFlexibleAttendancePayload(array $payload): bool
    {
        $type = Arr::get($payload, 'type') ?: Arr::get($payload, 'k');

        return in_array($type, ['flexible_attendance_session', 'ad_hoc_attendance_session', 'flex'], true)
            || Arr::get($payload, 'adHocSessionId');
    }

    private function isFreshCompactPayload(array $payload, string $expectedKind): bool
    {
        if ((string) Arr::get($payload, 'k') !== $expectedKind) return false;
        $issuedAt = (int) (Arr::get($payload, 'i') ?: Arr::get($payload, 'timestamp') ?: 0);
        if ($issuedAt > 10_000_000_000) $issuedAt = intdiv($issuedAt, 1000);
        $age = now()->timestamp - $issuedAt;

        return $issuedAt > 0 && $age >= -15 && $age <= 30;
    }

    private function same(mixed $left, mixed $right): bool
    {
        return Str::upper(trim((string) $left)) === Str::upper(trim((string) $right));
    }

    private function normalizeCode(mixed $value): string
    {
        return Str::upper(trim((string) $value));
    }

    private function normalizeGroup(mixed $value): string
    {
        return (string) Str::of((string) $value)
            ->trim()
            ->upper()
            ->replaceMatches('/^GROUP\s+/', '')
            ->replaceMatches('/^GRP\s+/', '');
    }

    private function normalizeWeek(mixed $value): string
    {
        $normalized = trim((string) $value);

        if (preg_match('/\d+/', $normalized, $matches)) {
            return (string) ((int) $matches[0]);
        }

        return $normalized;
    }

    private function findStudentByIdentifier(string $identifier): ?User
    {
        $normalized = Str::lower(trim($identifier));

        return User::query()
            ->where('role', 'student')
            ->where(function ($query) use ($normalized) {
                $query
                    ->whereRaw('LOWER(id) = ?', [$normalized])
                    ->orWhereRaw('LOWER(student_id) = ?', [$normalized])
                    ->orWhereRaw('LOWER(university_id) = ?', [$normalized])
                    ->orWhereRaw('LOWER(national_id) = ?', [$normalized])
                    ->orWhereRaw('LOWER(email) = ?', [$normalized]);
            })
            ->first();
    }

    private function attendancePayload(AttendanceRecord $record): array
    {
        $student = $record->student;
        $session = $record->lectureSession;

        return [
            'id' => $record->id,
            'attendanceRecordId' => $record->id,
            'sessionId' => $record->lecture_session_id,
            'studentId' => $record->student_id,
            'studentName' => $student?->full_name ?: $student?->name ?: $student?->email ?: 'Unknown Student',
            'studentUniversityId' => $student?->university_id ?: $student?->student_id ?: $student?->id,
            'course' => $session?->course_code ?: $record->course_code,
            'courseCode' => $session?->course_code ?: $record->course_code,
            'type' => $session?->lecture_type ?: $record->lecture_type,
            'lectureType' => $session?->lecture_type ?: $record->lecture_type,
            'group' => $this->normalizeGroup($session?->group ?: $record->group),
            'week' => $this->normalizeWeek($session?->week ?: $record->week),
            'date' => optional($session?->started_at)->format('Y-m-d') ?: '',
            'time' => optional($record->scanned_at)->format('h:i:s A') ?: '-',
            'status' => 'present',
            'scannedAt' => optional($record->scanned_at)->toISOString(),
        ];
    }

    private function findConfirmedScan(
        User $student,
        string $scanRequestId,
        ?int $attendanceRecordId = null,
        ?string $recordSource = null,
    ): ?array
    {
        $record = null;
        if ($recordSource !== 'flexible') {
            $recordQuery = AttendanceRecord::query()
                ->with('lectureSession')
                ->where('student_id', $student->id);
            if ($attendanceRecordId && $recordSource === 'official') {
                $recordQuery->whereKey($attendanceRecordId);
            } else {
                $recordQuery->where('scan_request_id', $scanRequestId);
            }
            $record = $recordQuery->first();
        }

        if ($record) {
            $record->setRelation('student', $student);

            return [
                'message' => 'Attendance confirmed successfully.',
                'confirmed' => true,
                'replayed' => true,
                'alreadyRecorded' => false,
                'attendance' => $this->attendancePayload($record),
                'session' => $this->sessionPayload($record->lectureSession),
            ];
        }

        if ($recordSource === 'official') {
            return null;
        }

        $flexibleRecordQuery = AdHocAttendanceRecord::query()
            ->with('session')
            ->where('student_id', $student->id);
        if ($attendanceRecordId && $recordSource === 'flexible') {
            $flexibleRecordQuery->whereKey($attendanceRecordId);
        } else {
            $flexibleRecordQuery->where('scan_request_id', $scanRequestId);
        }
        $flexibleRecord = $flexibleRecordQuery->first();

        if (! $flexibleRecord) {
            return null;
        }

        $officialRecord = AttendanceRecord::query()
            ->with('lectureSession')
            ->where('student_id', $student->id)
            ->where('lecture_session_id', $flexibleRecord->session?->linked_lecture_session_id)
            ->first();

        if (! $officialRecord) {
            return null;
        }

        $officialRecord->setRelation('student', $student);

        return [
            'message' => 'Attendance confirmed successfully.',
            'confirmed' => true,
            'replayed' => true,
            'alreadyRecorded' => false,
            'attendance' => $this->attendancePayload($officialRecord),
            'session' => $this->flexibleSessionPayload($flexibleRecord->session),
        ];
    }

    private function findExistingWeeklyAttendance(User $student, LectureSession $session): ?AttendanceRecord
    {
        return AttendanceRecord::query()
            ->with('lectureSession')
            ->where('student_id', $student->id)
            ->where('term_code', $session->term_code ?: AcademicTerm::getActiveTermCode())
            // The immutable session is authoritative; old registration-sync
            // code may have damaged the denormalized columns on the record.
            ->whereHas('lectureSession', function ($query) use ($session) {
                $query
                    ->where('course_code', $this->normalizeCode($session->course_code))
                    ->where('lecture_type', trim((string) $session->lecture_type))
                    ->where('week', $this->normalizeWeek($session->week));
            })
            ->latest('scanned_at')
            ->first();
    }

    private function flexibleAttendancePayload(AdHocAttendanceRecord $record): array
    {
        $student = $record->student;
        $session = $record->session;

        return [
            'id' => $record->id,
            'attendanceRecordId' => $record->id,
            'sessionId' => $record->ad_hoc_attendance_session_id,
            'studentId' => $record->student_id,
            'studentName' => $student?->full_name ?: $student?->name ?: $student?->email ?: 'Unknown Student',
            'studentUniversityId' => $student?->university_id ?: $student?->student_id ?: $student?->id,
            'course' => $session?->subject_name,
            'courseCode' => $session?->subject_code ?: $session?->subject_name,
            'type' => $session?->lecture_type ?: 'Flexible',
            'lectureType' => $session?->lecture_type ?: 'Flexible',
            'group' => $session?->group,
            'week' => $session?->week ?: 'Flexible',
            'date' => optional($session?->started_at)->format('Y-m-d') ?: '',
            'time' => optional($record->scanned_at)->format('h:i:s A') ?: '-',
            'status' => 'present',
            'scannedAt' => optional($record->scanned_at)->toISOString(),
            'isFlexible' => true,
        ];
    }

    private function sessionPayload(LectureSession $session): array
    {
        return [
            'id' => $session->id,
            'courseCode' => $session->course_code,
            'subjectName' => $this->sessionSubjectName($session),
            'lectureType' => $session->lecture_type,
            'group' => $session->group,
            'allowAllGroups' => (bool) $session->allow_all_groups,
            'week' => $session->week,
            'status' => $session->status,
        ];
    }

    private function sessionSubjectName(LectureSession $session): string
    {
        $subjectName = CatalogSubject::query()
            ->where('term_code', $session->term_code ?: AcademicTerm::getActiveTermCode())
            ->whereRaw('UPPER(subject_code) = ?', [$this->normalizeCode($session->course_code)])
            ->value('subject_name');

        $subjectName ??= CourseAssignment::query()
            ->where('term_code', $session->term_code ?: AcademicTerm::getActiveTermCode())
            ->whereRaw('UPPER(course_id) = ?', [$this->normalizeCode($session->course_code)])
            ->value('name');

        return trim((string) $subjectName) ?: $session->course_code;
    }

    private function flexibleSessionPayload(AdHocAttendanceSession $session): array
    {
        return [
            'id' => $session->id,
            'subjectName' => $session->subject_name,
            'subjectCode' => $session->subject_code,
            'faculty' => $session->faculty,
            'lectureType' => $session->lecture_type,
            'group' => $session->group,
            'allowAllGroups' => (bool) $session->allow_all_groups,
            'week' => $session->week,
            'qrWindowSeconds' => (int) ($session->qr_window_seconds ?: 5),
            'linkedLectureSessionId' => $session->linked_lecture_session_id,
            'status' => $session->status,
            'isFlexible' => true,
        ];
    }

    private function syncFlexibleAttendanceToOfficialSession(AdHocAttendanceSession $session, User $student, mixed $scannedAt): AttendanceRecord
    {
        $lectureSession = $this->ensureFlexibleLectureSession($session);
        $existingWeeklyRecord = $this->findExistingWeeklyAttendance($student, $lectureSession);

        if ($existingWeeklyRecord) {
            return $existingWeeklyRecord;
        }

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
                'term_code' => $lectureSession->term_code ?: \App\Models\AcademicTerm::getActiveTermCode(),
                'scanned_at' => $scannedAt ?? now(),
            ],
        );
    }

    private function ensureFlexibleLectureSession(AdHocAttendanceSession $session): LectureSession
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
        ]);

        $session->forceFill([
            'linked_lecture_session_id' => $lectureSession->id,
        ])->save();

        return $lectureSession;
    }

    private function backfillFlexibleAttendanceRecords(): void
    {
        AdHocAttendanceSession::query()
            ->with(['records.student', 'linkedLectureSession'])
            ->get()
            ->each(function (AdHocAttendanceSession $session) {
                foreach ($session->records as $record) {
                    if (! $record->student) {
                        continue;
                    }

                    $this->syncFlexibleAttendanceToOfficialSession($session, $record->student, $record->scanned_at);
                }
            });
    }
}
