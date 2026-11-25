<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\AdministrativeSubjectAbsence;
use App\Models\AcademicTerm;
use App\Models\AdHocAttendanceSession;
use App\Models\ApiToken;
use App\Models\CatalogSubject;
use App\Models\LectureSession;
use App\Models\StudentDeviceBinding;
use App\Models\StudentRegistration;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    private array $studentRefreshTokens = [];

    public function test_session_lists_do_not_write_attendance_or_query_subject_names_per_session(): void
    {
        $this->artisan('migrate:fresh --seed');
        $token = $this->loginAsSeededAdmin();
        $termCode = AcademicTerm::getActiveTermCode();
        for ($i = 1; $i <= 20; $i++) {
            LectureSession::query()->create([
                'id' => 'read-only-session-'.$i, 'user_id' => 'staff-1',
                'course_code' => 'CS101', 'lecture_type' => 'Lecture', 'group' => 'A',
                'week' => (string) $i, 'status' => 'ended', 'term_code' => $termCode,
                'started_at' => now(), 'ended_at' => now(),
            ]);
        }
        $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/terms')->assertOk();
        DB::enableQueryLog();
        DB::flushQueryLog();
        try {
            $this->withHeader('Authorization', "Bearer {$token}")
                ->getJson('/api/lecture-sessions')->assertOk()->assertJsonCount(20, 'sessions');
            $queries = collect(DB::getQueryLog())->pluck('query');
            $this->assertLessThan(20, $queries->count(), 'List queries must not grow with the number of sessions.');
            $this->assertEmpty($queries->filter(fn ($sql) => preg_match('/^\s*(insert|update|delete)\b/i', $sql))->all());
        } finally {
            DB::disableQueryLog();
            DB::flushQueryLog();
        }
    }

    public function test_session_summary_preserves_counts_and_loads_roster_only_on_detail(): void
    {
        $this->artisan('migrate:fresh --seed');
        $token = $this->loginAsSeededAdmin();
        $termCode = AcademicTerm::getActiveTermCode();
        LectureSession::query()->create([
            'id' => 'summary-session', 'user_id' => 'staff-1', 'course_code' => 'CS101',
            'lecture_type' => 'Lecture', 'group' => 'A', 'week' => '1',
            'status' => 'ended', 'term_code' => $termCode, 'started_at' => now(), 'ended_at' => now(),
        ]);
        AttendanceRecord::query()->create([
            'lecture_session_id' => 'summary-session', 'student_id' => 'student-1',
            'course_code' => 'CS101', 'lecture_type' => 'Lecture', 'group' => 'A',
            'week' => '1', 'term_code' => $termCode, 'scanned_at' => now(),
        ]);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/lecture-sessions?includeRecords=0')->assertOk()
            ->assertJsonPath('sessions.0.recordCount', 1)
            ->assertJsonPath('sessions.0.recordsLoaded', false)
            ->assertJsonPath('sessions.0.records', []);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/lecture-sessions/summary-session')->assertOk()
            ->assertJsonPath('session.recordsLoaded', true)
            ->assertJsonCount(1, 'session.records');
    }

    public function test_flexible_session_refresh_does_not_resynchronize_saved_attendance(): void
    {
        $this->artisan('migrate:fresh --seed');
        $token = $this->loginAsSeededStaff();
        $sessionId = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/ad-hoc-attendance', [
                'subjectName' => 'Programming', 'subjectCode' => 'CS101',
                'faculty' => 'Computer Science & Engineering', 'lectureType' => 'Lecture',
                'group' => 'A', 'week' => '1',
            ])->assertCreated()->json('session.id');
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/ad-hoc-attendance/{$sessionId}/students", ['studentId' => '20201001'])->assertOk();
        DB::enableQueryLog();
        DB::flushQueryLog();
        try {
            $this->withHeader('Authorization', "Bearer {$token}")
                ->getJson("/api/ad-hoc-attendance/{$sessionId}")->assertOk()->assertJsonPath('session.recordCount', 1);
            $this->withHeader('Authorization', "Bearer {$token}")
                ->getJson('/api/ad-hoc-attendance')->assertOk()->assertJsonPath('sessions.0.recordCount', 1);
            $writes = collect(DB::getQueryLog())->pluck('query')
                ->filter(fn ($sql) => preg_match('/^\s*(insert|update|delete)\b/i', $sql));
            $this->assertEmpty($writes->all(), 'Polling must not rewrite each attendee.');
        } finally {
            DB::disableQueryLog();
            DB::flushQueryLog();
        }
    }

    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_admin_can_login_with_seeded_account(): void
    {
        $this->artisan('migrate:fresh --seed');

        $response = $this->postJson('/api/auth/login', [
            'email' => 'a',
            'password' => '123',
            'role' => 'admin',
            'language' => 'en',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('role', 'admin')
            ->assertJsonStructure(['token', 'expiresAt']);
    }

    public function test_staff_can_generate_a_ten_minute_numeric_access_code_while_staff_tokens_do_not_expire(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminLogin = $this->postJson('/api/auth/login', [
            'email' => 'a',
            'password' => '123',
            'role' => 'admin',
        ])->assertOk();
        $adminExpiresAt = Carbon::parse($adminLogin->json('expiresAt'));
        $this->assertTrue($adminExpiresAt->betweenIncluded(now()->addHours(24)->subSeconds(2), now()->addHours(24)->addSeconds(2)));

        $staffLogin = $this->postJson('/api/auth/login', [
            'email' => 'staff',
            'password' => '123',
            'role' => 'staff',
        ])->assertOk()->assertJsonPath('expiresAt', null);
        $staffToken = $staffLogin->json('token');

        $accessCodeResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/auth/staff/access-code')
            ->assertOk();
        $accessCode = $accessCodeResponse->json('data.code');
        $this->assertMatchesRegularExpression('/^\\d{4}$/', $accessCode);
        $this->assertTrue(Carbon::parse($accessCodeResponse->json('data.expiresAt'))->betweenIncluded(now()->addMinutes(10)->subSeconds(2), now()->addMinutes(10)->addSeconds(2)));

        $staff = User::query()->findOrFail('staff-1');
        $this->assertTrue(Hash::check($accessCode, $staff->temporary_login_code_hash));
        $this->assertNotNull($staff->temporary_login_code_expires_at);
        $this->assertNotNull($staff->temporary_login_code_digest);
        $this->assertDatabaseHas('api_tokens', ['user_id' => 'staff-1', 'expires_at' => null]);

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->getJson('/api/auth/staff/access-code')
            ->assertOk()
            ->assertJsonPath('data.expiresAt', $staff->temporary_login_code_expires_at->toISOString())
            ->assertJsonMissingPath('data.code');

        $this->postJson('/api/auth/login', [
            'email' => 'staff',
            'password' => $accessCode,
            'role' => 'staff',
        ])->assertUnauthorized();

        $temporaryLogin = $this->postJson('/api/auth/login', [
            'email' => $accessCode,
            'password' => $accessCode,
            'role' => 'staff',
        ])->assertOk()
            ->assertJsonPath('loginMethod', 'temporary_access_code')
            ->assertJsonPath('expiresAt', $staff->temporary_login_code_expires_at->toISOString());
        $temporaryToken = $temporaryLogin->json('token');
        $this->assertDatabaseHas('api_tokens', [
            'user_id' => 'staff-1',
            'name' => \App\Services\Auth\AuthService::TEMPORARY_STAFF_ACCESS_TOKEN_NAME,
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->deleteJson('/api/auth/staff/access-code')
            ->assertOk()
            ->assertJsonPath('data.revokedSessions', 1);
        $this
            ->withHeader('Authorization', "Bearer {$temporaryToken}")
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
        $this->postJson('/api/auth/login', [
            'email' => $accessCode,
            'password' => $accessCode,
            'role' => 'staff',
        ])->assertUnauthorized();

        $replacementCode = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/auth/staff/access-code')
            ->assertOk()
            ->json('data.code');

        $replacementLogin = $this->postJson('/api/auth/login', [
            'email' => $replacementCode,
            'password' => $replacementCode,
            'role' => 'staff',
        ])->assertOk();
        $replacementToken = $replacementLogin->json('token');

        $renewedCode = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/auth/staff/access-code')
            ->assertOk()
            ->json('data.code');
        $this
            ->withHeader('Authorization', "Bearer {$replacementToken}")
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
        $this->postJson('/api/auth/login', [
            'email' => $replacementCode,
            'password' => $replacementCode,
            'role' => 'staff',
        ])->assertUnauthorized();

        $staff->refresh()->forceFill(['temporary_login_code_expires_at' => now()->subSecond()])->save();
        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->getJson('/api/auth/staff/access-code')
            ->assertOk()
            ->assertJsonPath('data.expiresAt', null);
        $this->postJson('/api/auth/login', [
            'email' => $renewedCode,
            'password' => $renewedCode,
            'role' => 'staff',
        ])->assertUnauthorized();
    }

    public function test_active_temporary_access_codes_are_unique_and_identify_their_staff_account(): void
    {
        $this->artisan('migrate:fresh --seed');

        User::query()->create([
            'id' => 'staff-2',
            'email' => 'staff-two',
            'name' => 'Second Staff Member',
            'full_name' => 'Second Staff Member',
            'password' => '123',
            'role' => 'staff',
            'permissions' => Permissions::STAFF,
            'allowed_colleges' => [],
        ]);

        $firstToken = $this->postJson('/api/auth/login', [
            'email' => 'staff',
            'password' => '123',
            'role' => 'staff',
        ])->assertOk()->json('token');
        $secondToken = $this->postJson('/api/auth/login', [
            'email' => 'staff-two',
            'password' => '123',
            'role' => 'staff',
        ])->assertOk()->json('token');

        $firstCode = $this->withHeader('Authorization', "Bearer {$firstToken}")
            ->postJson('/api/auth/staff/access-code')
            ->assertOk()
            ->json('data.code');
        $secondCode = $this->withHeader('Authorization', "Bearer {$secondToken}")
            ->postJson('/api/auth/staff/access-code')
            ->assertOk()
            ->json('data.code');

        $this->assertNotSame($firstCode, $secondCode);
        $this->assertNotSame(
            User::query()->findOrFail('staff-1')->temporary_login_code_digest,
            User::query()->findOrFail('staff-2')->temporary_login_code_digest,
        );

        $this->postJson('/api/auth/login', [
            'email' => $secondCode,
            'password' => $secondCode,
            'role' => 'staff',
        ])->assertOk()
            ->assertJsonPath('id', 'staff-2')
            ->assertJsonPath('loginMethod', 'temporary_access_code');
    }

    public function test_existing_data_defaults_to_the_active_summer_2025_2026_term(): void
    {
        $this->artisan('migrate:fresh --seed');

        $token = $this->loginAsSeededAdmin();

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/terms')
            ->assertOk()
            ->assertJsonPath('data.0.code', 'SUMMER-2025-2026')
            ->assertJsonPath('data.0.isActive', true);

        $this->assertDatabaseHas('student_registrations', [
            'user_id' => 'student-1',
            'term_code' => 'SUMMER-2025-2026',
        ]);
        $this->assertDatabaseHas('course_assignments', [
            'user_id' => 'staff-1',
            'term_code' => 'SUMMER-2025-2026',
        ]);
    }

    public function test_admin_can_create_student_with_registrations(): void
    {
        $this->artisan('migrate:fresh --seed');

        $token = $this->loginAsSeededAdmin();

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/users', [
                'id' => 'student-2',
                'email' => 'student-2',
                'password' => '123456',
                'name' => 'Second Student',
                'fullName' => 'Second Student',
                'role' => 'student',
                'studentId' => '20201002',
                'universityId' => '20201002',
                'nationalId' => '29901011234567',
                'college' => 'Computer Science & Engineering',
                'registrations' => [
                    ['subjectCode' => 'CS101', 'group' => 'A', 'type' => 'Lecture'],
                    ['subjectCode' => 'CS201', 'group' => 'B', 'type' => 'Section'],
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('id', 'student-2')
            ->assertJsonPath('role', 'student')
            ->assertJsonCount(2, 'registrations');
    }

    public function test_student_api_supports_crud_for_students(): void
    {
        $this->artisan('migrate:fresh --seed');

        $token = $this->loginAsSeededAdmin();

        $createResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/students', [
                'id' => 'student-api-1',
                'name' => 'API Student',
                'studentId' => '20205555',
                'nationalId' => '29901011235555',
                'college' => 'Computer Science & Engineering',
                'registrations' => [
                    ['subjectCode' => 'CS101', 'group' => 'A', 'type' => 'Lecture'],
                ],
            ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('id', 'student-api-1')
            ->assertJsonPath('studentId', '20205555');

        $listResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/students');

        $listResponse
            ->assertOk()
            ->assertJsonFragment(['id' => 'student-api-1']);

        $updateResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/students/student-api-1', [
                'name' => 'Updated API Student',
                'studentId' => '20205555',
                'nationalId' => '29901011235555',
                'college' => 'Computer Science & Engineering',
                'registrations' => [
                    ['subjectCode' => 'CS101', 'group' => 'B', 'type' => 'Section'],
                ],
            ]);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('name', 'Updated API Student')
            ->assertJsonPath('registrations.0.group', 'B');

        $deleteResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/students/student-api-1');

        $deleteResponse->assertNoContent();
    }

    public function test_student_registration_uses_catalog_name_and_rejects_unknown_subject_codes(): void
    {
        $this->artisan('migrate:fresh --seed');

        $token = $this->loginAsSeededAdmin();

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/students', [
                'id' => 'catalog-linked-student',
                'name' => 'Catalog Linked Student',
                'studentId' => '20207771',
                'nationalId' => '29901011237771',
                'college' => 'Computer Science & Engineering',
                'registrations' => [[
                    'subjectCode' => 'cs101',
                    'subjectName' => 'Wrong name from sheet',
                    'group' => 'A',
                    'type' => 'Lecture',
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('registrations.0.subjectCode', 'CS101')
            ->assertJsonPath('registrations.0.subjectName', 'Intro to Programming');

        $this->assertDatabaseHas('student_registrations', [
            'user_id' => 'catalog-linked-student',
            'subject_code' => 'CS101',
            'subject_name' => 'Intro to Programming',
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/students', [
                'id' => 'unknown-subject-student',
                'name' => 'Unknown Subject Student',
                'studentId' => '20207772',
                'nationalId' => '29901011237772',
                'college' => 'Computer Science & Engineering',
                'registrations' => [[
                    'subjectCode' => 'NOT-IN-CATALOG',
                    'group' => 'A',
                    'type' => 'Lecture',
                ]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['registrations.0.subjectCode']);

        $this->assertDatabaseMissing('users', ['id' => 'unknown-subject-student']);
        $this->assertDatabaseMissing('catalog_subjects', ['subject_code' => 'NOT-IN-CATALOG']);
    }

    public function test_catalog_listing_does_not_create_subjects_from_student_registrations(): void
    {
        $this->artisan('migrate:fresh --seed');

        $termCode = AcademicTerm::getActiveTermCode();
        StudentRegistration::query()->create([
            'user_id' => 'student-1',
            'subject_code' => 'SHEET-ONLY-101',
            'subject_name' => 'Sheet Only Subject',
            'group' => 'A',
            'type' => 'Lecture',
            'term_code' => $termCode,
        ]);

        $token = $this->loginAsSeededAdmin();
        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/catalog/subjects?facultyId=computers-ai')
            ->assertOk()
            ->assertJsonMissing(['subjectCode' => 'SHEET-ONLY-101']);

        $this->assertDatabaseMissing('catalog_subjects', ['subject_code' => 'SHEET-ONLY-101']);
    }

    public function test_admin_subject_absence_is_shown_in_student_history_without_becoming_presence(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('student-explicit-absence-history');

        $response = $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/subject-absences', [
                'studentId' => '20201001',
                'facultyId' => 'computers-ai',
                'subjectCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
            ])
            ->assertCreated()
            ->assertJsonPath('record.studentUniversityId', '20201001')
            ->assertJsonPath('record.courseCode', 'CS101');

        $this->assertDatabaseHas('administrative_subject_absences', [
            'student_id' => 'student-1',
            'subject_code' => 'CS101',
            'week' => '1',
        ]);
        $this->assertDatabaseCount('attendance_records', 0);

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/attendance/my')
            ->assertOk()
            ->assertJsonPath('data.0.courseCode', 'CS101')
            ->assertJsonPath('data.0.status', 'absent')
            ->assertJsonPath('data.0.source', 'administrative_absence');

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->getJson('/api/admin/subject-absences')
            ->assertForbidden();

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->deleteJson('/api/admin/subject-absences/'.$response->json('record.id'))
            ->assertNoContent();
    }

    public function test_registration_by_itself_does_not_create_a_student_absence(): void
    {
        $this->artisan('migrate:fresh --seed');

        $studentToken = $this->loginAsSeededStudent('student-registration-is-not-absence');

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/attendance/my')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_admin_can_preview_student_profile_and_history_by_national_id_without_student_login(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();
        $termCode = AcademicTerm::getActiveTermCode();
        $session = LectureSession::query()->create([
            'id' => 'admin-student-preview-session',
            'user_id' => 'staff-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
            'status' => 'ended',
            'started_at' => now(),
            'ended_at' => now(),
            'term_code' => $termCode,
        ]);
        AttendanceRecord::query()->create([
            'lecture_session_id' => $session->id,
            'student_id' => 'student-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
            'scanned_at' => now(),
            'term_code' => $termCode,
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/admin-student-view?nationalId=29801011234567')
            ->assertOk()
            ->assertHeader('Cache-Control', 'max-age=0, no-store, private')
            ->assertJsonPath('student.id', 'student-1')
            ->assertJsonPath('student.nationalId', '29801011234567')
            ->assertJsonPath('attendance.0.sessionId', $session->id)
            ->assertJsonPath('attendance.0.status', 'present');

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->getJson('/api/attendance/admin-student-view?nationalId=29801011234567')
            ->assertForbidden();
    }

    public function test_admin_manual_attendance_creates_an_administrative_session_when_no_session_exists(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $termCode = AcademicTerm::getActiveTermCode();

        $response = $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/attendance/manual', [
                'studentId' => '29801011234567',
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '9',
            ])
            ->assertCreated()
            ->assertJsonPath('attendance.studentId', 'student-1')
            ->assertJsonPath('attendance.courseCode', 'CS101')
            ->assertJsonPath('attendance.week', '9');

        $this->assertDatabaseHas('lecture_sessions', [
            'id' => $response->json('attendance.sessionId'),
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '9',
            'status' => 'ended',
            'term_code' => $termCode,
        ]);
        $this->assertDatabaseHas('attendance_records', [
            'lecture_session_id' => $response->json('attendance.sessionId'),
            'student_id' => 'student-1',
            'week' => '9',
            'term_code' => $termCode,
        ]);
    }

    public function test_admin_registration_override_is_off_by_default_and_is_limited_to_the_student_faculty(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $termCode = AcademicTerm::getActiveTermCode();
        $payload = [
            'studentId' => '29801011234567',
            'facultyId' => 'computers-ai',
            'courseCode' => 'CS201',
            'lectureType' => 'Lecture',
            'group' => 'B',
            'week' => '10',
        ];

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/attendance/manual', $payload)
            ->assertUnprocessable();

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/attendance/manual', [...$payload, 'allowUnregistered' => true])
            ->assertCreated()
            ->assertJsonPath('attendance.courseCode', 'CS201')
            ->assertJsonPath('attendance.group', 'B');

        CatalogSubject::query()->create([
            'faculty_id' => 'engineering',
            'faculty_name' => 'Faculty of Engineering',
            'subject_code' => 'ENG-OVERRIDE-TEST',
            'subject_name' => 'Engineering override test',
            'group_count' => 1,
            'group_counts' => ['Lecture' => 1],
            'types' => ['Lecture'],
            'term_code' => $termCode,
        ]);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/attendance/manual', [
                ...$payload,
                'facultyId' => 'engineering',
                'courseCode' => 'ENG-OVERRIDE-TEST',
                'week' => '11',
                'allowUnregistered' => true,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The student belongs to a different faculty.');
    }

    public function test_presence_and_explicit_absence_cannot_conflict_for_the_same_session(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $termCode = AcademicTerm::getActiveTermCode();
        $absencePayload = [
            'studentId' => '20201001',
            'facultyId' => 'computers-ai',
            'subjectCode' => 'CS101',
            'lectureType' => 'Lecture',
            'group' => 'A',
            'week' => '1',
        ];

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/subject-absences', $absencePayload)
            ->assertCreated();

        $session = LectureSession::query()->create([
            'id' => 'presence-wins-over-absence',
            'user_id' => 'staff-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
            'status' => 'ended',
            'started_at' => now(),
            'ended_at' => now(),
            'term_code' => $termCode,
        ]);
        AttendanceRecord::query()->create([
            'lecture_session_id' => $session->id,
            'student_id' => 'student-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
            'scanned_at' => now(),
            'term_code' => $termCode,
        ]);

        $this->assertDatabaseMissing('administrative_subject_absences', [
            'student_id' => 'student-1',
            'subject_code' => 'CS101',
            'week' => '1',
        ]);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/subject-absences', $absencePayload)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This student is already recorded as present for the selected subject session.');
    }

    public function test_admin_can_view_and_activate_locked_student_accounts(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();

        $this
            ->postJson('/api/auth/login', [
                'email' => 'student',
                'password' => '123',
                'role' => 'student',
                'language' => 'en',
                'deviceIdentifier' => 'locked-student-original-device',
            ])
            ->assertOk();

        $lockedResponse = $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/students/locked');

        $lockedResponse
            ->assertOk()
            ->assertJsonPath('students.0.student.id', 'student-1')
            ->assertJsonPath('students.0.student.activationCount', 0);

        $lockedId = $lockedResponse->json('students.0.id');

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/students/locked/{$lockedId}/activate")
            ->assertOk()
            ->assertJsonPath('activated', 1)
            ->assertJsonPath('activationCount', 1);

        $this->assertDatabaseHas('users', [
            'id' => 'student-1',
            'activation_count' => 1,
        ]);

        $this
            ->postJson('/api/auth/login', [
                'email' => 'student',
                'password' => '123',
                'role' => 'student',
                'language' => 'en',
                'deviceIdentifier' => 'locked-student-new-device',
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/students/locked/activate-all')
            ->assertOk()
            ->assertJsonPath('activated', 1);

        $this->assertDatabaseHas('users', [
            'id' => 'student-1',
            'activation_count' => 2,
        ]);
    }

    public function test_activate_all_locked_students_respects_the_selected_faculty(): void
    {
        $this->artisan('migrate:fresh --seed');

        $termCode = AcademicTerm::getActiveTermCode();
        $adminToken = $this->loginAsSeededAdmin();
        $computerStudent = User::query()->findOrFail('student-1');
        $nursingStudent = User::query()->create([
            'id' => 'student-nursing-locked',
            'email' => 'nursing-locked@student.local',
            'name' => 'Nursing Locked Student',
            'full_name' => 'Nursing Locked Student',
            'password' => Hash::make('123'),
            'role' => 'student',
            'college' => 'Faculty of Nursing',
            'student_id' => '20209991',
            'university_id' => '20209991',
        ]);

        $computerBinding = StudentDeviceBinding::query()->create([
            'user_id' => $computerStudent->id,
            'email' => $computerStudent->email,
            'device_identifier' => 'computer-locked-device',
            'term_code' => $termCode,
        ]);
        $nursingBinding = StudentDeviceBinding::query()->create([
            'user_id' => $nursingStudent->id,
            'email' => $nursingStudent->email,
            'device_identifier' => 'nursing-locked-device',
            'term_code' => $termCode,
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/students/locked/activate-all', ['facultyId' => 'computers-ai'])
            ->assertOk()
            ->assertJsonPath('activated', 1);

        $this->assertDatabaseMissing('student_device_bindings', ['id' => $computerBinding->id]);
        $this->assertDatabaseHas('student_device_bindings', ['id' => $nursingBinding->id]);
    }

    public function test_imported_student_can_login_with_student_identifiers_and_default_password(): void
    {
        $this->artisan('migrate:fresh --seed');

        $token = $this->loginAsSeededAdmin();

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/students', [
                'id' => 'student-imported-1',
                'name' => 'Imported Student',
                'studentId' => '20206666',
                'nationalId' => '29901011236666',
                'email' => '',
                'password' => '',
                'college' => 'Computer Science & Engineering',
                'registrations' => [
                    ['subjectCode' => 'CS101', 'group' => 'A', 'type' => 'Lecture'],
                ],
            ])
            ->assertCreated();

        $this
            ->postJson('/api/auth/login', [
                'email' => '20206666',
                'password' => '20206666',
                'role' => 'student',
                'language' => 'en',
                'deviceIdentifier' => 'test-device-imported-student',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('id', 'student-imported-1');

        $this
            ->postJson('/api/auth/login', [
                'email' => '29901011236666',
                'password' => '20206666',
                'role' => 'student',
                'language' => 'en',
                'deviceIdentifier' => 'test-device-imported-student',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('id', 'student-imported-1');
    }

    public function test_student_can_login_with_default_identifier_even_if_import_had_random_password(): void
    {
        $this->artisan('migrate:fresh --seed');

        $token = $this->loginAsSeededAdmin();

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/students', [
                'id' => 'student-random-import-password',
                'name' => 'Random Password Student',
                'studentId' => '20208888',
                'nationalId' => '29901011238888',
                'email' => '29901011238888',
                'password' => 'RandomExcelPassword123',
                'college' => 'Computer Science & Engineering',
                'registrations' => [
                    ['subjectCode' => 'CS101', 'group' => 'A', 'type' => 'Lecture'],
                ],
            ])
            ->assertCreated();

        $this
            ->postJson('/api/auth/login', [
                'email' => '29901011238888',
                'password' => '20208888',
                'role' => 'student',
                'language' => 'en',
                'deviceIdentifier' => 'test-device-default-password',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('id', 'student-random-import-password');
    }

    public function test_imported_student_password_can_be_reset_from_upload_update(): void
    {
        $this->artisan('migrate:fresh --seed');

        $token = $this->loginAsSeededAdmin();

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/students', [
                'id' => 'student-imported-2',
                'name' => 'Imported Student Reset',
                'studentId' => '20207777',
                'nationalId' => '29901011237777',
                'email' => '29901011237777',
                'password' => 'OldPassword123',
                'college' => 'Computer Science & Engineering',
                'registrations' => [
                    ['subjectCode' => 'CS101', 'group' => 'A', 'type' => 'Lecture'],
                ],
            ])
            ->assertCreated();

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/students/student-imported-2', [
                'name' => 'Imported Student Reset',
                'studentId' => '20207777',
                'nationalId' => '29901011237777',
                'email' => '29901011237777',
                'password' => 'NewPassword456',
                'college' => 'Computer Science & Engineering',
                'registrations' => [
                    ['subjectCode' => 'CS101', 'group' => 'A', 'type' => 'Lecture'],
                ],
            ])
            ->assertOk();

        $this
            ->postJson('/api/auth/login', [
                'email' => '29901011237777',
                'password' => 'OldPassword123',
                'role' => 'student',
                'language' => 'en',
                'deviceIdentifier' => 'test-device-old-password',
            ])
            ->assertUnauthorized();

        $this
            ->postJson('/api/auth/login', [
                'email' => '29901011237777',
                'password' => 'NewPassword456',
                'role' => 'student',
                'language' => 'en',
                'deviceIdentifier' => 'test-device-new-password',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('id', 'student-imported-2');
    }

    public function test_updating_student_registration_keeps_attendance_history_in_the_session_group(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $student = User::query()->whereKey('student-1')->firstOrFail();

        $session = LectureSession::query()->create([
            'id' => 'registration-history-session',
            'user_id' => 'staff-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
            'status' => 'ended',
            'started_at' => now(),
            'ended_at' => now(),
            'term_code' => AcademicTerm::getActiveTermCode(),
        ]);

        AttendanceRecord::query()->create([
            'lecture_session_id' => $session->id,
            'student_id' => $student->id,
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
            'term_code' => AcademicTerm::getActiveTermCode(),
            'scanned_at' => now(),
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson('/api/students/student-1', [
                'name' => 'Seed Student',
                'studentId' => '20201001',
                'nationalId' => '29901011234566',
                'college' => 'Computer Science & Engineering',
                'registrations' => [
                    ['subjectCode' => 'CS101', 'group' => 'B', 'type' => 'Lecture'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('registrations.0.group', 'B');

        $this->assertDatabaseHas('attendance_records', [
            'student_id' => $student->id,
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
        ]);

        $this->assertDatabaseMissing('attendance_records', [
            'student_id' => $student->id,
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'B',
            'week' => '1',
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance')
            ->assertOk()
            ->assertJsonFragment([
                'studentId' => $student->id,
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
            ]);
    }

    public function test_session_identity_controls_history_absence_and_weekly_duplicate_checks_after_registration_changes(): void
    {
        $this->artisan('migrate:fresh --seed');

        $termCode = AcademicTerm::getActiveTermCode();
        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-session-history-source');

        $lectureSession = LectureSession::query()->create([
            'id' => 'historical-lecture-source',
            'user_id' => 'staff-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
            'status' => 'ended',
            'started_at' => now()->subHour(),
            'ended_at' => now(),
            'term_code' => $termCode,
        ]);

        // Simulate a legacy row damaged by the old registration-sync behavior.
        AttendanceRecord::withoutEvents(fn () => AttendanceRecord::query()->create([
            'lecture_session_id' => $lectureSession->id,
            'student_id' => 'student-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Section',
            'group' => 'B',
            'week' => '1',
            'term_code' => $termCode,
            'scanned_at' => now()->subMinutes(50),
        ]));

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson('/api/students/student-1', [
                'name' => 'Seed Student',
                'studentId' => '20201001',
                'nationalId' => '29901011234566',
                'college' => 'Computer Science & Engineering',
                'registrations' => [
                    ['subjectCode' => 'CS101', 'group' => 'B', 'type' => 'Section'],
                ],
            ])
            ->assertOk();

        $history = $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/attendance/my')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.lectureType', 'Lecture')
            ->assertJsonPath('data.0.group', 'A')
            ->assertJsonPath('data.0.week', '1');
        $history->assertJsonMissing(['lectureType' => 'Flexible']);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS101')
            ->assertOk()
            ->assertJsonPath('rows.0.types.Lecture.attended', 1)
            ->assertJsonPath('rows.0.types.Lecture.weeks', ['1']);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS101&lectureType=Lecture&ignoreRegistration=1')
            ->assertOk()
            ->assertJsonPath('rows.0.types.Lecture.attended', 1)
            ->assertJsonPath('rows.0.types.Lecture.weeks', ['1']);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/subject-absences', [
                'studentId' => 'student-1',
                'facultyId' => 'computers-ai',
                'subjectCode' => 'CS101',
                'lectureType' => 'Section',
                'group' => 'B',
                'week' => '1',
            ])
            ->assertCreated();

        $sectionSession = LectureSession::query()->create([
            'id' => 'real-section-after-historical-lecture',
            'user_id' => 'staff-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Section',
            'group' => 'B',
            'week' => '1',
            'status' => 'active',
            'started_at' => now(),
            'term_code' => $termCode,
            'qr_token' => 'LQ-SECTIONHISTORY',
            'qr_token_expires_at' => now()->addMinute(),
        ]);

        $scanRequestId = '11111111-2222-4333-8444-555555555555';
        $sectionScan = $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => $sectionSession->qr_token,
                'scanRequestId' => $scanRequestId,
            ])
            ->assertOk()
            ->assertJsonPath('alreadyRecorded', false)
            ->assertJsonPath('confirmed', true)
            ->assertJsonPath('attendance.lectureType', 'Section');
        $sectionAttendanceRecordId = $sectionScan->json('attendance.attendanceRecordId');

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan-status', ['scanRequestId' => $scanRequestId])
            ->assertOk()
            ->assertJsonPath('confirmed', true)
            ->assertJsonPath('attendance.lectureType', 'Section');

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan-status', [
                'scanRequestId' => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                'attendanceRecordId' => $sectionAttendanceRecordId,
                'recordSource' => 'official',
            ])
            ->assertOk()
            ->assertJsonPath('confirmed', true)
            ->assertJsonPath('attendance.attendanceRecordId', $sectionAttendanceRecordId);

        $sectionSession->forceFill([
            'qr_token' => 'LQ-ROTATED-AFTER-COMMIT',
            'qr_token_expires_at' => now()->addMinute(),
        ])->save();
        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => 'LQ-SECTIONHISTORY',
                'scanRequestId' => $scanRequestId,
            ])
            ->assertOk()
            ->assertJsonPath('confirmed', true)
            ->assertJsonPath('replayed', true);

        $this->assertSame(1, AttendanceRecord::query()
            ->where('student_id', 'student-1')
            ->whereHas('lectureSession', fn ($query) => $query->where('lecture_type', 'Section'))
            ->count());

        $this->assertDatabaseMissing('administrative_subject_absences', [
            'student_id' => 'student-1',
            'subject_code' => 'CS101',
            'lecture_type' => 'Section',
            'group' => 'B',
            'week' => '1',
        ]);
    }

    public function test_admin_can_add_and_delete_staff_course_assignment(): void
    {
        $this->artisan('migrate:fresh --seed');

        $token = $this->loginAsSeededAdmin();

        $createResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/staff/staff-1/courses', [
                'uid' => 'CS201-SEC',
                'id' => 'CS201',
                'name' => 'Data Structures',
                'faculty' => 'engineering',
                'college' => 'cs',
                'type' => 'Section',
            ]);

        $createResponse
            ->assertOk()
            ->assertJsonFragment(['uid' => 'CS201-SEC']);

        $deleteResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/admin/staff/staff-1/courses/CS201-SEC');

        $deleteResponse
            ->assertOk()
            ->assertJsonMissing(['uid' => 'CS201-SEC']);
    }

    public function test_scoped_managers_only_manage_their_allowed_user_role(): void
    {
        $this->artisan('migrate:fresh --seed');

        User::query()->whereKey('staff-1')->update([
            'permissions' => [Permissions::MANAGE_ADMINS],
        ]);
        $managerToken = $this->loginAsSeededStaff();

        $this
            ->withHeader('Authorization', "Bearer {$managerToken}")
            ->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonPath('admins.0.id', 'admin-1');

        $this
            ->withHeader('Authorization', "Bearer {$managerToken}")
            ->postJson('/api/admin/users', [
                'id' => 'admin-limited-1',
                'name' => 'Limited Admin',
                'email' => 'limited-admin@example.test',
                'password' => 'password',
                'userRole' => 'admin',
                'permissions' => [Permissions::MANAGE_ADMINS],
            ])
            ->assertCreated()
            ->assertJsonPath('id', 'admin-limited-1');

        $this
            ->withHeader('Authorization', "Bearer {$managerToken}")
            ->deleteJson('/api/admin/users/staff-1')
            ->assertForbidden();

        $this
            ->withHeader('Authorization', "Bearer {$managerToken}")
            ->deleteJson('/api/admin/users/admin-limited-1')
            ->assertNoContent();

        User::query()->whereKey('staff-1')->update([
            'permissions' => [Permissions::MANAGE_DOCTORS],
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$managerToken}")
            ->deleteJson('/api/admin/users/admin-1')
            ->assertForbidden();
    }

    public function test_subject_catalog_stores_group_count_and_types(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/catalog/subjects', [
                'facultyId' => 'engineering',
                'subjectName' => 'Digital Systems',
                'subjectCode' => 'EE220',
                'groupCount' => 3,
                'types' => ['Lecture', 'Section', 'Practical'],
            ])
            ->assertCreated()
            ->assertJsonPath('subject.groupCount', 3)
            ->assertJsonPath('subject.groups', ['A', 'B', 'C'])
            ->assertJsonPath('subject.types', ['Lecture', 'Section', 'Practical']);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/catalog/subjects/import', [
                'facultyId' => 'engineering',
                'subjects' => [[
                    'subjectName' => 'Control Systems',
                    'subjectCode' => 'EE330',
                    'groupCount' => 2,
                    'types' => ['Lecture', 'Section'],
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('summary.created', 1);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/catalog/subjects?facultyId=engineering')
            ->assertOk()
            ->assertJsonFragment([
                'subjectCode' => 'EE330',
                'groupCount' => 2,
                'groups' => ['A', 'B'],
                'types' => ['Lecture', 'Section'],
            ]);
    }

    public function test_student_scan_records_attendance_when_subject_type_and_group_match(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-attendance-match');
        $this->ensureSeededStaffCatalogSubject();

        $sessionResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
            ]);

        $sessionResponse
            ->assertCreated()
            ->assertJsonPath('session.courseCode', 'CS101')
            ->assertJsonStructure(['qrPayload', 'qrExpiresAt', 'qrWindowSeconds']);

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => $sessionResponse->json('qrPayload'),
            ])
            ->assertOk()
            ->assertJsonPath('attendance.status', 'present')
            ->assertJsonPath('attendance.courseCode', 'CS101');
    }

    public function test_student_scan_rejects_wrong_group_for_same_subject(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-attendance-wrong-group');

        $termCode = AcademicTerm::getActiveTermCode();
        CatalogSubject::query()->updateOrCreate(
            [
                'faculty_id' => 'engineering',
                'subject_code' => 'CS101',
                'term_code' => $termCode,
            ],
            [
                'faculty_name' => 'Faculty of Engineering',
                'subject_name' => 'Intro to Programming',
                'group_count' => 2,
                'group_counts' => ['Lecture' => 2],
                'types' => ['Lecture'],
            ],
        );

        $sessionResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'B',
                'week' => '1',
            ])
            ->assertCreated();

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => $sessionResponse->json('qrPayload'),
            ])
            ->assertForbidden()
            ->assertJsonFragment(['message' => 'You are enrolled in Intro to Programming, but not in Lecture group B.']);
    }

    public function test_all_groups_session_accepts_enrolled_student_and_appears_in_history_and_reports(): void
    {
        $this->artisan('migrate:fresh --seed');

        $termCode = AcademicTerm::getActiveTermCode();
        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-attendance-all-groups');

        CatalogSubject::query()->updateOrCreate(
            [
                'faculty_id' => 'engineering',
                'subject_code' => 'CS101',
                'term_code' => $termCode,
            ],
            [
                'faculty_name' => 'Faculty of Engineering',
                'subject_name' => 'Intro to Programming',
                'group_count' => 2,
                'group_counts' => ['Lecture' => 2],
                'types' => ['Lecture'],
            ],
        );

        $sessionResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'B',
                'week' => '1',
                'allowAllGroups' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('session.allowAllGroups', true);

        $sessionId = $sessionResponse->json('session.id');

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => $sessionResponse->json('qrPayload'),
            ])
            ->assertOk()
            ->assertJsonPath('attendance.courseCode', 'CS101')
            ->assertJsonPath('attendance.group', 'B');

        $this->assertDatabaseHas('attendance_records', [
            'lecture_session_id' => $sessionId,
            'student_id' => 'student-1',
            'course_code' => 'CS101',
            'group' => 'B',
            'week' => '1',
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->getJson("/api/lecture-sessions/{$sessionId}")
            ->assertOk()
            ->assertJsonPath('session.id', $sessionId)
            ->assertJsonPath('session.recordCount', 1)
            ->assertJsonPath('session.records.0.studentId', 'student-1');

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/attendance/my')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment([
                'sessionId' => $sessionId,
                'courseCode' => 'CS101',
                'group' => 'B',
                'week' => '1',
                'status' => 'present',
            ]);

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson("/api/lecture-sessions/{$sessionId}/end")
            ->assertOk();

        $sameWeekSession = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
                'allowAllGroups' => true,
            ])
            ->assertCreated();

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => $sameWeekSession->json('qrPayload'),
            ])
            ->assertOk()
            ->assertJsonPath('alreadyRecorded', true)
            ->assertJsonPath('attendance.sessionId', $sessionId)
            ->assertJsonPath('message', 'Attendance was already recorded for this subject in this week.');

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/attendance/manual', [
                'studentId' => '20201001',
                'lectureSessionId' => $sameWeekSession->json('session.id'),
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
            ])
            ->assertOk()
            ->assertJsonPath('attendance.sessionId', $sessionId);

        $this->assertSame(1, AttendanceRecord::query()
            ->where('student_id', 'student-1')
            ->where('course_code', 'CS101')
            ->where('lecture_type', 'Lecture')
            ->where('week', '1')
            ->count());

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions/'.$sameWeekSession->json('session.id').'/end')
            ->assertOk();

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->getJson('/api/attendance/report?courseCode=CS101&lectureType=Lecture')
            ->assertOk()
            ->assertJsonPath('rows.0.studentId', '20201001')
            ->assertJsonPath('rows.0.types.Lecture.attended', 1)
            ->assertJsonPath('rows.0.types.Lecture.total', 1)
            ->assertJsonPath('rows.0.types.Lecture.weeks', ['1']);

        StudentRegistration::query()
            ->where('user_id', 'student-1')
            ->where('subject_code', 'CS101')
            ->where('term_code', $termCode)
            ->delete();

        $unenrolledSession = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'B',
                'week' => '2',
                'allowAllGroups' => true,
            ])
            ->assertCreated();

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => $unenrolledSession->json('qrPayload'),
            ])
            ->assertForbidden()
            ->assertJsonPath('errorCode', 'NOT_ENROLLED_IN_SUBJECT');
    }

    public function test_all_groups_session_cannot_record_a_second_attendance_in_another_group_for_the_same_week(): void
    {
        $this->artisan('migrate:fresh --seed');

        $termCode = AcademicTerm::getActiveTermCode();
        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-cross-group-weekly-duplicate');

        CatalogSubject::query()->updateOrCreate(
            [
                'faculty_id' => 'engineering',
                'subject_code' => 'CS101',
                'term_code' => $termCode,
            ],
            [
                'faculty_name' => 'Faculty of Engineering',
                'subject_name' => 'Intro to Programming',
                'group_count' => 2,
                'group_counts' => ['Lecture' => 2],
                'types' => ['Lecture'],
            ],
        );

        $registeredGroupSession = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '2',
                'allowAllGroups' => false,
            ])
            ->assertCreated();

        $firstScan = $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', ['qrPayload' => $registeredGroupSession->json('qrPayload')])
            ->assertOk()
            ->assertJsonPath('alreadyRecorded', false)
            ->assertJsonPath('attendance.group', 'A');

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions/'.$registeredGroupSession->json('session.id').'/end')
            ->assertOk();

        $allGroupsSession = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'B',
                'week' => '2',
                'allowAllGroups' => true,
            ])
            ->assertCreated();

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', ['qrPayload' => $allGroupsSession->json('qrPayload')])
            ->assertOk()
            ->assertJsonPath('alreadyRecorded', true)
            ->assertJsonPath('attendance.id', $firstScan->json('attendance.id'))
            ->assertJsonPath('attendance.group', 'A')
            ->assertJsonPath('message', 'Attendance was already recorded for this subject in this week.');

        $this->assertSame(1, AttendanceRecord::query()
            ->where('student_id', 'student-1')
            ->where('course_code', 'CS101')
            ->where('lecture_type', 'Lecture')
            ->where('week', '2')
            ->count());

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/attendance/my')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.group', 'A')
            ->assertJsonPath('data.0.week', '2');
    }

    public function test_closed_session_records_absence_that_is_hidden_after_unregistration_and_restored_after_reregistration(): void
    {
        $this->artisan('migrate:fresh --seed');

        $termCode = AcademicTerm::getActiveTermCode();
        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-automatic-absence');

        CatalogSubject::query()->updateOrCreate(
            [
                'faculty_id' => 'engineering',
                'subject_code' => 'CS101',
                'term_code' => $termCode,
            ],
            [
                'faculty_name' => 'Faculty of Engineering',
                'subject_name' => 'Intro to Programming',
                'group_count' => 2,
                'group_counts' => ['Lecture' => 2],
                'types' => ['Lecture'],
            ],
        );

        $session = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '5',
            ])
            ->assertCreated();
        $sessionId = $session->json('session.id');

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson("/api/lecture-sessions/{$sessionId}/end")
            ->assertOk();

        $absence = AdministrativeSubjectAbsence::query()
            ->where('student_id', 'student-1')
            ->where('subject_code', 'CS101')
            ->where('lecture_type', 'Lecture')
            ->where('week', '5')
            ->firstOrFail();
        $this->assertSame('automatic_session', $absence->source);
        $this->assertSame($sessionId, $absence->lecture_session_id);

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/attendance/my')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'absent')
            ->assertJsonPath('data.0.sessionId', $sessionId)
            ->assertJsonPath('data.0.week', '5');

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '5',
            ])
            ->assertOk()
            ->assertJsonPath('reopened', true);
        $this->assertDatabaseMissing('administrative_subject_absences', ['id' => $absence->id]);

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson("/api/lecture-sessions/{$sessionId}/end")
            ->assertOk();
        $absence = AdministrativeSubjectAbsence::query()
            ->where('lecture_session_id', $sessionId)
            ->where('student_id', 'student-1')
            ->firstOrFail();

        StudentRegistration::query()
            ->where('user_id', 'student-1')
            ->where('subject_code', 'CS101')
            ->where('term_code', $termCode)
            ->delete();

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/attendance/my')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->assertDatabaseHas('administrative_subject_absences', ['id' => $absence->id]);

        StudentRegistration::query()->create([
            'user_id' => 'student-1',
            'subject_code' => 'CS101',
            'subject_name' => 'Intro to Programming',
            'group' => 'B',
            'type' => 'Lecture',
            'term_code' => $termCode,
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/attendance/my')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'absent')
            ->assertJsonPath('data.0.group', 'A');

        $laterSession = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'B',
                'week' => '5',
            ])
            ->assertCreated();

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', ['qrPayload' => $laterSession->json('qrPayload')])
            ->assertOk()
            ->assertJsonPath('attendance.group', 'B');

        $this->assertDatabaseMissing('administrative_subject_absences', ['id' => $absence->id]);
        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/attendance/my')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'present')
            ->assertJsonPath('data.0.group', 'B')
            ->assertJsonPath('data.0.week', '5');

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions/'.$laterSession->json('session.id').'/end')
            ->assertOk();
        $this->assertDatabaseMissing('administrative_subject_absences', [
            'student_id' => 'student-1',
            'subject_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'week' => '5',
        ]);

        $closeAllSession = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'B',
                'week' => '6',
            ])
            ->assertCreated();

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions/close-all')
            ->assertOk()
            ->assertJsonPath('closedCount', 1);
        $this->assertDatabaseHas('administrative_subject_absences', [
            'lecture_session_id' => $closeAllSession->json('session.id'),
            'student_id' => 'student-1',
            'source' => 'automatic_session',
            'week' => '6',
        ]);
    }

    public function test_student_scan_records_flexible_attendance_even_when_not_registered_in_the_subject(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-flexible-scan');

        $sessionResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/ad-hoc-attendance', [
                'subjectName' => 'Advanced Databases',
                'subjectCode' => 'CS401',
                'faculty' => 'Computer Science & Engineering',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
                'qrWindowSeconds' => 5,
            ])
            ->assertCreated()
            ->assertJsonStructure(['qrPayload', 'qrExpiresAt', 'qrWindowSeconds']);

        $flexibleScanRequestId = '99999999-8888-4777-8666-555555555555';
        $flexibleScan = $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => $sessionResponse->json('qrPayload'),
                'scanRequestId' => $flexibleScanRequestId,
            ])
            ->assertOk()
            ->assertJsonPath('attendance.courseCode', 'CS401')
            ->assertJsonPath('attendance.lectureType', 'Lecture')
            ->assertJsonPath('attendance.group', 'A')
            ->assertJsonPath('session.linkedLectureSessionId', $sessionResponse->json('session.linkedLectureSessionId'));

        $adHocRecordId = $flexibleScan->json('attendance.attendanceRecordId');
        $officialRecordId = AttendanceRecord::query()
            ->where('lecture_session_id', $sessionResponse->json('session.linkedLectureSessionId'))
            ->where('student_id', 'student-1')
            ->value('id');

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan-status', [
                'scanRequestId' => $flexibleScanRequestId,
                'attendanceRecordId' => $adHocRecordId,
                'recordSource' => 'flexible',
            ])
            ->assertOk()
            ->assertJsonPath('confirmed', true)
            ->assertJsonPath('attendance.attendanceRecordId', $officialRecordId)
            ->assertJsonPath('attendance.status', 'present');

        $this->assertDatabaseHas('ad_hoc_attendance_records', [
            'ad_hoc_attendance_session_id' => $sessionResponse->json('session.id'),
            'student_id' => 'student-1',
        ]);

        $this->assertDatabaseHas('attendance_records', [
            'lecture_session_id' => $sessionResponse->json('session.linkedLectureSessionId'),
            'student_id' => 'student-1',
            'course_code' => 'CS401',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
        ]);
    }

    public function test_doctor_can_require_subject_registration_for_flexible_qr_scans(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-flexible-registration-required');
        User::whereKey('staff-1')->update(['require_flexible_student_registration' => true]);

        $session = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/ad-hoc-attendance', [
                'subjectName' => 'Advanced Databases',
                'subjectCode' => 'CS401',
                'faculty' => 'Faculty of Engineering',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
                'qrWindowSeconds' => 5,
            ])
            ->assertCreated();

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => $session->json('qrPayload'),
                'scanRequestId' => '77777777-8888-4777-8666-555555555555',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errorCode', 'STUDENT_NOT_REGISTERED_IN_SUBJECT');

        $this->assertDatabaseMissing('ad_hoc_attendance_records', [
            'ad_hoc_attendance_session_id' => $session->json('session.id'),
            'student_id' => 'student-1',
        ]);
    }

    public function test_student_scan_accepts_compact_qr_payload(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-attendance-compact');
        $this->ensureSeededStaffCatalogSubject();

        $sessionResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
            ])
            ->assertCreated();

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => [
                    'v' => 1,
                    'k' => 'att',
                    's' => $sessionResponse->json('session.id'),
                    'i' => (int) round(microtime(true) * 1000),
                    'w' => 5,
                    'n' => 'FAST1234',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('attendance.status', 'present')
            ->assertJsonPath('attendance.courseCode', 'CS101');
    }

    public function test_staff_can_refresh_short_qr_token_for_active_lecture_session(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-short-qr');
        $this->ensureSeededStaffCatalogSubject();

        $sessionResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
            ])
            ->assertCreated();

        $refreshedTokenResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->getJson('/api/lecture-sessions/'.$sessionResponse->json('session.id').'/qr-token?window=3');

        $refreshedTokenResponse
            ->assertOk()
            ->assertJsonPath('qrWindowSeconds', 3);

        $this->assertIsString($refreshedTokenResponse->json('qrPayload'));
        $this->assertStringStartsWith('LQ-', $refreshedTokenResponse->json('qrPayload'));

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => $refreshedTokenResponse->json('qrPayload'),
                'scanRequestId' => '10000000-2000-4000-8000-000000000000',
            ])
            ->assertOk()
            ->assertJsonPath('confirmed', true)
            ->assertJsonPath('attendance.status', 'present');
    }

    public function test_queued_scan_is_accepted_using_its_original_qr_window_after_rotation_and_session_end(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-delayed-qr');
        $this->ensureSeededStaffCatalogSubject();
        $startedAt = Carbon::parse('2026-09-24 10:00:00', 'UTC');
        Carbon::setTestNow($startedAt);

        try {
            $sessionResponse = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/lecture-sessions', [
                    'courseCode' => 'CS101',
                    'lectureType' => 'Lecture',
                    'group' => 'A',
                    'week' => '1',
                    'qrWindowSeconds' => 3,
                ])
                ->assertCreated();

            $sessionId = $sessionResponse->json('session.id');
            $firstQr = $sessionResponse->json('qrPayload');
            $scannedAt = $startedAt->copy()->addSecond();

            Carbon::setTestNow($startedAt->copy()->addSeconds(4));
            $secondQr = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->getJson("/api/lecture-sessions/{$sessionId}/qr-token?window=3")
                ->assertOk()
                ->json('qrPayload');
            $this->assertNotSame($firstQr, $secondQr);

            $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson("/api/lecture-sessions/{$sessionId}/end")
                ->assertOk();

            $this->assertDatabaseHas('administrative_subject_absences', [
                'lecture_session_id' => $sessionId,
                'student_id' => 'student-1',
                'source' => \App\Services\Attendance\AutomaticAbsenceService::SOURCE,
            ]);

            Carbon::setTestNow($startedAt->copy()->addHours(2));
            $studentToken = $this->refreshSeededStudentToken('test-device-delayed-qr');
            $scanRequestId = '10000000-2000-4000-8000-000000000001';
            $response = $this
                ->withHeader('Authorization', "Bearer {$studentToken}")
                ->postJson('/api/attendance/scan', [
                    'qrPayload' => $firstQr,
                    'scanRequestId' => $scanRequestId,
                    'queued' => true,
                    'scannedAt' => $scannedAt->toISOString(),
                ])
                ->assertOk()
                ->assertJsonPath('confirmed', true)
                ->assertJsonPath('alreadyRecorded', false);

            $attendanceRecordId = $response->json('attendance.attendanceRecordId');
            $this->assertNotNull($attendanceRecordId);
            $canonicalScannedAt = Carbon::parse($response->json('attendance.scannedAt'));
            $this->assertTrue($canonicalScannedAt->equalTo($startedAt));
            $this->assertFalse($canonicalScannedAt->equalTo($scannedAt));
            $this->assertDatabaseMissing('administrative_subject_absences', [
                'lecture_session_id' => $sessionId,
                'student_id' => 'student-1',
                'source' => \App\Services\Attendance\AutomaticAbsenceService::SOURCE,
            ]);

            $this
                ->withHeader('Authorization', "Bearer {$studentToken}")
                ->postJson('/api/attendance/scan-status', [
                    'scanRequestId' => $scanRequestId,
                    'attendanceRecordId' => $attendanceRecordId,
                    'recordSource' => 'official',
                ])
                ->assertOk()
                ->assertJsonPath('confirmed', true);

            // A lost HTTP response may cause the queue to retry after the QR is
            // gone. The same request id must return the committed row first.
            $this
                ->withHeader('Authorization', "Bearer {$studentToken}")
                ->postJson('/api/attendance/scan', [
                    'qrPayload' => 'LQ-NO-LONGER-AVAILABLE',
                    'scanRequestId' => $scanRequestId,
                    'queued' => true,
                    'scannedAt' => $startedAt->copy()->subYear()->toISOString(),
                ])
                ->assertOk()
                ->assertJsonPath('confirmed', true)
                ->assertJsonPath('replayed', true);

            $this->assertSame(1, AttendanceRecord::query()
                ->where('scan_request_id', $scanRequestId)
                ->count());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_student_can_record_attendance_with_the_current_six_digit_session_code(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-session-code');
        $this->ensureSeededStaffCatalogSubject();

        $sessionResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
                'qrWindowSeconds' => 10,
            ])
            ->assertCreated();

        $sessionCode = (string) $sessionResponse->json('sessionCode');
        $this->assertMatchesRegularExpression('/^\d{6}$/', $sessionCode);

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'sessionCode' => $sessionCode,
                'scanRequestId' => '20000000-2000-4000-8000-000000000001',
            ])
            ->assertOk()
            ->assertJsonPath('confirmed', true)
            ->assertJsonPath('attendance.status', 'present');
    }

    public function test_queued_scan_ignores_client_time_and_uses_server_proof_time(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-invalid-delayed-qr');
        $this->ensureSeededStaffCatalogSubject();
        $startedAt = Carbon::parse('2026-09-24 12:00:00', 'UTC');
        Carbon::setTestNow($startedAt);

        try {
            $sessionResponse = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/lecture-sessions', [
                    'courseCode' => 'CS101',
                    'lectureType' => 'Lecture',
                    'group' => 'A',
                    'week' => '1',
                    'qrWindowSeconds' => 3,
                ])
                ->assertCreated();

            Carbon::setTestNow($startedAt->copy()->addMinutes(10));
            $studentToken = $this->refreshSeededStudentToken('test-device-invalid-delayed-qr');
            $response = $this
                ->withHeader('Authorization', "Bearer {$studentToken}")
                ->postJson('/api/attendance/scan', [
                    'qrPayload' => $sessionResponse->json('qrPayload'),
                    'scanRequestId' => '10000000-2000-4000-8000-000000000002',
                    'queued' => true,
                    'scannedAt' => $startedAt->copy()->addSeconds(20)->toISOString(),
                ])
                ->assertOk()
                ->assertJsonPath('confirmed', true);

            $this->assertDatabaseHas('attendance_records', [
                'student_id' => 'student-1',
                'scan_request_id' => '10000000-2000-4000-8000-000000000002',
                'scanned_at' => $startedAt->format('Y-m-d H:i:s'),
            ]);
            $this->assertSame($startedAt->toISOString(), $response->json('attendance.scannedAt'));
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_student_can_synchronize_server_clock_for_offline_scan_timestamps(): void
    {
        $this->artisan('migrate:fresh --seed');

        $studentToken = $this->loginAsSeededStudent('test-device-server-clock');
        $expected = Carbon::parse('2026-09-24 14:30:00', 'UTC');
        Carbon::setTestNow($expected);

        try {
            $studentToken = $this->refreshSeededStudentToken('test-device-server-clock');
            $this
                ->withHeader('Authorization', "Bearer {$studentToken}")
                ->getJson('/api/attendance/server-time')
                ->assertOk()
                ->assertJsonPath('serverTime', $expected->toISOString());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_queued_flexible_code_is_accepted_after_rotation_and_session_close(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-delayed-flexible-qr');
        $startedAt = Carbon::parse('2026-09-24 16:00:00', 'UTC');
        Carbon::setTestNow($startedAt);

        try {
            $sessionResponse = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/ad-hoc-attendance', [
                    'subjectName' => 'Intro to Programming',
                    'subjectCode' => 'CS101',
                    'faculty' => 'Faculty of Engineering',
                    'lectureType' => 'Lecture',
                    'group' => 'A',
                    'week' => '1',
                    'qrWindowSeconds' => 3,
                ])
                ->assertCreated();

            $sessionId = $sessionResponse->json('session.id');
            $firstCode = $sessionResponse->json('sessionCode');
            $this->assertMatchesRegularExpression('/^\d{6}$/', (string) $firstCode);
            $scannedAt = $startedAt->copy()->addSecond();

            Carbon::setTestNow($startedAt->copy()->addSeconds(4));
            $secondCode = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->getJson("/api/ad-hoc-attendance/{$sessionId}/qr-token?window=3")
                ->assertOk()
                ->json('sessionCode');
            $this->assertNotSame($firstCode, $secondCode);

            $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson("/api/ad-hoc-attendance/{$sessionId}/close")
                ->assertOk()
                ->assertJsonPath('session.status', 'closed');

            Carbon::setTestNow($startedAt->copy()->addHours(2));
            $studentToken = $this->refreshSeededStudentToken('test-device-delayed-flexible-qr');
            $this
                ->withHeader('Authorization', "Bearer {$studentToken}")
                ->postJson('/api/attendance/scan', [
                    'sessionCode' => $firstCode,
                    'scanRequestId' => '10000000-2000-4000-8000-000000000003',
                    'queued' => true,
                    'scannedAt' => $scannedAt->toISOString(),
                ])
                ->assertOk()
                ->assertJsonPath('confirmed', true)
                ->assertJsonPath('attendance.isFlexible', true);

            $this->assertDatabaseHas('attendance_records', [
                'student_id' => 'student-1',
                'scanned_at' => $startedAt->format('Y-m-d H:i:s'),
            ]);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_genuine_offline_session_code_syncs_after_official_session_ends(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-delayed-official-code');
        $this->ensureSeededStaffCatalogSubject();
        $startedAt = Carbon::parse('2026-09-25 09:00:00', 'UTC');
        Carbon::setTestNow($startedAt);

        try {
            $sessionResponse = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/lecture-sessions', [
                    'courseCode' => 'CS101',
                    'lectureType' => 'Lecture',
                    'group' => 'A',
                    'week' => '2',
                    'qrWindowSeconds' => 3,
                ])
                ->assertCreated();

            $sessionCode = (string) $sessionResponse->json('sessionCode');
            $sessionId = $sessionResponse->json('session.id');

            Carbon::setTestNow($startedAt->copy()->addSeconds(4));
            $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson("/api/lecture-sessions/{$sessionId}/end")
                ->assertOk();

            Carbon::setTestNow($startedAt->copy()->addHours(3));
            $studentToken = $this->refreshSeededStudentToken('test-device-delayed-official-code');
            $this
                ->withHeader('Authorization', "Bearer {$studentToken}")
                ->postJson('/api/attendance/scan', [
                    'sessionCode' => $sessionCode,
                    'scanRequestId' => '30000000-2000-4000-8000-000000000001',
                    'queued' => true,
                    'scannedAt' => $startedAt->copy()->subYear()->toISOString(),
                ])
                ->assertOk()
                ->assertJsonPath('confirmed', true)
                ->assertJsonPath('attendance.scannedAt', $startedAt->toISOString());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_ambiguous_offline_session_code_is_rejected_instead_of_selecting_wrong_session(): void
    {
        $this->artisan('migrate:fresh --seed');

        $studentToken = $this->loginAsSeededStudent('test-device-ambiguous-offline-code');
        $issuedAt = now()->subMinute();
        $proof = fn (string $sessionId) => [
            'kind' => 'lecture',
            'sessionId' => $sessionId,
            'issuedAt' => $issuedAt->timestamp,
            'validFrom' => $issuedAt->toISOString(),
            'validUntil' => $issuedAt->copy()->addSeconds(10)->toISOString(),
            'source' => 'session_code',
        ];
        Cache::put('attendance_code:654321', [
            $proof('first-session'),
            $proof('second-session'),
        ], now()->addDay());

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'sessionCode' => '654321',
                'scanRequestId' => '30000000-2000-4000-8000-000000000007',
                'queued' => true,
                'scannedAt' => now()->subMinute()->toISOString(),
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errorCode', 'INVALID_OFFLINE_PROOF');
    }

    public function test_forged_offline_qr_is_rejected_even_with_fake_past_time(): void
    {
        $this->artisan('migrate:fresh --seed');

        $studentToken = $this->loginAsSeededStudent('test-device-forged-offline-qr');

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => 'LQ-FORGED1234',
                'scanRequestId' => '30000000-2000-4000-8000-000000000002',
                'queued' => true,
                'scannedAt' => now()->subYear()->toISOString(),
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errorCode', 'INVALID_OFFLINE_PROOF');

        $this->assertDatabaseMissing('attendance_records', [
            'scan_request_id' => '30000000-2000-4000-8000-000000000002',
        ]);
    }

    public function test_future_client_time_does_not_change_offline_authorization_or_canonical_time(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-future-offline-time');
        $this->ensureSeededStaffCatalogSubject();
        $startedAt = Carbon::parse('2026-09-25 11:00:00', 'UTC');
        Carbon::setTestNow($startedAt);

        try {
            $sessionResponse = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/lecture-sessions', [
                    'courseCode' => 'CS101',
                    'lectureType' => 'Lecture',
                    'group' => 'A',
                    'week' => '3',
                    'qrWindowSeconds' => 3,
                ])
                ->assertCreated();

            $sessionId = $sessionResponse->json('session.id');
            $qrPayload = $sessionResponse->json('qrPayload');
            $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson("/api/lecture-sessions/{$sessionId}/end")
                ->assertOk();

            Carbon::setTestNow($startedAt->copy()->addHours(2));
            $studentToken = $this->refreshSeededStudentToken('test-device-future-offline-time');
            $this
                ->withHeader('Authorization', "Bearer {$studentToken}")
                ->postJson('/api/attendance/scan', [
                    'qrPayload' => $qrPayload,
                    'scanRequestId' => '30000000-2000-4000-8000-000000000003',
                    'queued' => true,
                    'scannedAt' => $startedAt->copy()->addYears(10)->toISOString(),
                ])
                ->assertOk()
                ->assertJsonPath('attendance.scannedAt', $startedAt->toISOString());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_offline_proof_beyond_sync_grace_period_is_rejected(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-too-old-offline-proof');
        $this->ensureSeededStaffCatalogSubject();
        $startedAt = Carbon::parse('2026-09-25 13:00:00', 'UTC');
        Carbon::setTestNow($startedAt);

        try {
            $sessionResponse = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/lecture-sessions', [
                    'courseCode' => 'CS101',
                    'lectureType' => 'Lecture',
                    'group' => 'A',
                    'week' => '4',
                    'qrWindowSeconds' => 3,
                ])
                ->assertCreated();

            Carbon::setTestNow($startedAt->copy()->addHours(24)->addSeconds(4));
            $studentToken = $this->refreshSeededStudentToken('test-device-too-old-offline-proof');
            $this
                ->withHeader('Authorization', "Bearer {$studentToken}")
                ->postJson('/api/attendance/scan', [
                    'qrPayload' => $sessionResponse->json('qrPayload'),
                    'scanRequestId' => '30000000-2000-4000-8000-000000000004',
                    'queued' => true,
                    'scannedAt' => $startedAt->copy()->addSecond()->toISOString(),
                ])
                ->assertUnprocessable()
                ->assertJsonPath('errorCode', 'OFFLINE_SCAN_TOO_OLD');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_normal_online_scan_of_ended_session_still_fails(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-ended-online-session');
        $this->ensureSeededStaffCatalogSubject();

        $sessionResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '5',
                'qrWindowSeconds' => 15,
            ])
            ->assertCreated();

        $sessionId = $sessionResponse->json('session.id');
        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson("/api/lecture-sessions/{$sessionId}/end")
            ->assertOk();

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => $sessionResponse->json('qrPayload'),
                'scanRequestId' => '30000000-2000-4000-8000-000000000005',
            ])
            ->assertStatus(409)
            ->assertJsonPath('errorCode', 'ATTENDANCE_SESSION_ENDED');
    }

    public function test_previous_signed_qr_format_remains_usable_for_offline_sync(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-previous-signed-qr');
        $this->ensureSeededStaffCatalogSubject();
        $startedAt = Carbon::parse('2026-09-25 15:00:00', 'UTC');
        Carbon::setTestNow($startedAt);

        try {
            $sessionResponse = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/lecture-sessions', [
                    'courseCode' => 'CS101',
                    'lectureType' => 'Lecture',
                    'group' => 'A',
                    'week' => '6',
                ])
                ->assertCreated();

            $sessionId = $sessionResponse->json('session.id');
            $data = ['k' => 'lecture', 's' => $sessionId, 'i' => $startedAt->timestamp];
            $encodedPayload = rtrim(strtr(base64_encode(json_encode($data)), '+/', '-_'), '=');
            $appKey = (string) config('app.key');
            $signingKey = str_starts_with($appKey, 'base64:')
                ? (base64_decode(substr($appKey, 7), true) ?: $appKey)
                : $appKey;
            $signature = rtrim(strtr(base64_encode(hash_hmac('sha256', $encodedPayload, $signingKey, true)), '+/', '-_'), '=');
            $previousQr = "AQ1.{$encodedPayload}.{$signature}";

            $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson("/api/lecture-sessions/{$sessionId}/end")
                ->assertOk();

            Carbon::setTestNow($startedAt->copy()->addHours(2));
            $studentToken = $this->refreshSeededStudentToken('test-device-previous-signed-qr');
            $this
                ->withHeader('Authorization', "Bearer {$studentToken}")
                ->postJson('/api/attendance/scan', [
                    'qrPayload' => $previousQr,
                    'scanRequestId' => '30000000-2000-4000-8000-000000000006',
                    'queued' => true,
                    'scannedAt' => $startedAt->copy()->addSecond()->toISOString(),
                ])
                ->assertOk()
                ->assertJsonPath('confirmed', true)
                ->assertJsonPath('attendance.scannedAt', $startedAt->toISOString());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_student_scan_accepts_compact_flexible_qr_payload(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-flex-compact');

        $sessionResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/ad-hoc-attendance', [
                'subjectName' => 'Introduction to Programming',
                'subjectCode' => 'CS101',
                'faculty' => 'Faculty of Engineering',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
                'qrWindowSeconds' => 5,
            ])
            ->assertCreated();

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->postJson('/api/attendance/scan', [
                'qrPayload' => [
                    'v' => 1,
                    'k' => 'flex',
                    's' => $sessionResponse->json('session.id'),
                    'i' => (int) round(microtime(true) * 1000),
                    'w' => 5,
                    'n' => 'FLEX1234',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('attendance.status', 'present')
            ->assertJsonPath('attendance.isFlexible', true);
    }

    public function test_admin_migration_retargets_the_existing_official_session_instead_of_copying_to_a_new_one(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();
        $studentToken = $this->loginAsSeededStudent('test-device-migrated-history');

        $sessionResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/ad-hoc-attendance', [
                'subjectName' => 'Intro to Programming',
                'subjectCode' => 'CS101',
                'faculty' => 'Computer Science & Engineering',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
                'qrWindowSeconds' => 5,
            ])
            ->assertCreated();

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson(sprintf('/api/ad-hoc-attendance/%s/students', $sessionResponse->json('session.id')), [
                'studentId' => '20201001',
            ])
            ->assertOk();

        $linkedLectureSessionId = $sessionResponse->json('session.linkedLectureSessionId');

        $this->assertDatabaseHas('attendance_records', [
            'lecture_session_id' => $linkedLectureSessionId,
            'student_id' => 'student-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
        ]);

        $migrationResponse = $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson(sprintf('/api/ad-hoc-attendance/%s/migrate', $sessionResponse->json('session.id')), [
                'courseCode' => 'CS201',
                'lectureType' => 'Section',
                'group' => 'B',
                'week' => '2',
                'faculty' => 'Faculty of Engineering',
            ])
            ->assertOk()
            ->assertJsonPath('lectureSessionId', $linkedLectureSessionId)
            ->assertJsonPath('migratedCount', 1)
            ->assertJsonPath('session.status', 'migrated')
            ->assertJsonPath('session.migration.courseCode', 'CS201')
            ->assertJsonPath('session.migration.group', 'B')
            ->assertJsonPath('session.migration.week', '2');

        $this->assertDatabaseHas('lecture_sessions', [
            'id' => $linkedLectureSessionId,
            'course_code' => 'CS201',
            'lecture_type' => 'Section',
            'group' => 'B',
            'week' => '2',
            'status' => 'ended',
        ]);

        $this->assertDatabaseHas('attendance_records', [
            'lecture_session_id' => $linkedLectureSessionId,
            'student_id' => 'student-1',
            'course_code' => 'CS201',
            'lecture_type' => 'Section',
            'group' => 'B',
            'week' => '2',
        ]);

        $this->assertDatabaseMissing('attendance_records', [
            'lecture_session_id' => $linkedLectureSessionId,
            'student_id' => 'student-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance')
            ->assertOk()
            ->assertJsonFragment([
                'sessionId' => $linkedLectureSessionId,
                'studentId' => 'student-1',
                'courseCode' => 'CS201',
                'lectureType' => 'Section',
                'group' => 'B',
                'week' => '2',
            ]);

        $this
            ->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/attendance/my')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment([
                'sessionId' => $linkedLectureSessionId,
                'courseCode' => 'CS201',
                'lectureType' => 'Section',
                'group' => 'B',
                'week' => '2',
                'status' => 'present',
            ]);

        // The student is not registered in CS201, so this specifically verifies
        // that ignore-registration reports include migrated attendance.
        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS201&lectureType=Section&ignoreRegistration=1')
            ->assertOk()
            ->assertJsonPath('meta.totalStudents', 1)
            ->assertJsonPath('rows.0.studentId', '20201001')
            ->assertJsonPath('rows.0.types.Section.attended', 1)
            ->assertJsonPath('rows.0.types.Section.weeks', ['2']);

        $migrationResponse->assertJsonMissing([
            'lectureSessionId' => $sessionResponse->json('session.id'),
        ]);
    }

    public function test_admin_can_close_all_matching_open_flexible_sessions_in_the_active_term(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();
        $sessionIds = [];

        foreach (['CS401', 'CS402'] as $subjectCode) {
            $response = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/ad-hoc-attendance', [
                    'subjectName' => "Close target {$subjectCode}",
                    'subjectCode' => $subjectCode,
                    'faculty' => 'Faculty of Engineering',
                    'lectureType' => 'Lecture',
                    'group' => 'A',
                    'week' => '1',
                ])
                ->assertCreated();

            $sessionIds[] = $response->json('session.id');
        }

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/ad-hoc-attendance/close-all', ['search' => 'Close target'])
            ->assertOk()
            ->assertJsonPath('closedCount', 2);

        foreach ($sessionIds as $sessionId) {
            $this->assertDatabaseHas('ad_hoc_attendance_sessions', [
                'id' => $sessionId,
                'status' => 'closed',
            ]);

            $linkedLectureSessionId = \App\Models\AdHocAttendanceSession::query()
                ->findOrFail($sessionId)
                ->linked_lecture_session_id;

            $this->assertDatabaseHas('lecture_sessions', [
                'id' => $linkedLectureSessionId,
                'status' => 'ended',
            ]);
        }
    }

    public function test_migrate_all_exposes_flexible_attendance_as_an_official_session_and_in_reports(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();

        $sessionResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/ad-hoc-attendance', [
                'subjectName' => 'Migration cycle target',
                'subjectCode' => 'CS101',
                'faculty' => 'Computer Science & Engineering',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '6',
            ])
            ->assertCreated();

        $flexibleSessionId = $sessionResponse->json('session.id');
        $linkedLectureSessionId = AdHocAttendanceSession::query()
            ->findOrFail($flexibleSessionId)
            ->linked_lecture_session_id;

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson("/api/ad-hoc-attendance/{$flexibleSessionId}/students", [
                'studentId' => '20201001',
            ])
            ->assertOk();

        StudentRegistration::query()
            ->where('user_id', 'student-1')
            ->where('subject_code', 'CS101')
            ->where('term_code', AcademicTerm::getActiveTermCode())
            ->update(['type' => 'Section']);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS101&lectureType=Lecture&group=A&week=6')
            ->assertOk()
            ->assertJsonPath('meta.presentRecords', 1);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS101&lectureType=Lecture&group=A&week=6&ignoreRegistration=1')
            ->assertOk()
            ->assertJsonPath('meta.totalSessions', 1)
            ->assertJsonPath('meta.presentRecords', 1)
            ->assertJsonPath('rows.0.studentId', '20201001')
            ->assertJsonPath('rows.0.isRegistered', false)
            ->assertJsonPath('rows.0.types.Lecture.attended', 1)
            ->assertJsonPath('rows.0.types.Lecture.weeks', ['6']);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/ad-hoc-attendance/migrate-all', [
                'search' => 'Migration cycle target',
            ])
            ->assertOk()
            ->assertJsonPath('migratedSessions', 1)
            ->assertJsonPath('migratedStudents', 1)
            ->assertJsonPath('failedSessions', []);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/lecture-sessions')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $linkedLectureSessionId,
                'courseCode' => 'CS101',
                'group' => 'A',
                'week' => '6',
                'recordCount' => 1,
            ]);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS101&group=A&week=6')
            ->assertOk()
            ->assertJsonPath('meta.totalSessions', 1)
            ->assertJsonPath('meta.presentRecords', 1)
            ->assertJsonPath('rows.0.types.Lecture.attended', 1);
    }

    public function test_flexible_migration_adds_to_existing_doctor_session_without_losing_attendance(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();
        $termCode = AcademicTerm::getActiveTermCode();

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/users', [
                'id' => 'migration-student-2',
                'email' => 'migration-student-2',
                'password' => '123456',
                'name' => 'Migration Student Two',
                'fullName' => 'Migration Student Two',
                'role' => 'student',
                'studentId' => '20209992',
                'universityId' => '20209992',
                'nationalId' => '29901011239992',
                'college' => 'Computer Science & Engineering',
                'registrations' => [
                    ['subjectCode' => 'CS101', 'group' => 'A', 'type' => 'Lecture'],
                ],
            ])
            ->assertCreated();

        $officialSession = LectureSession::query()->create([
            'id' => 'existing-official-migration-session',
            'user_id' => 'staff-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '7',
            'status' => 'ended',
            'started_at' => now()->subHour(),
            'ended_at' => now(),
            'term_code' => $termCode,
        ]);
        AttendanceRecord::query()->create([
            'lecture_session_id' => $officialSession->id,
            'student_id' => 'student-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '7',
            'term_code' => $termCode,
            'scanned_at' => now()->subMinutes(50),
        ]);

        $flexibleResponse = $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/ad-hoc-attendance', [
                'subjectName' => 'Additive migration target',
                'subjectCode' => 'CS101',
                'faculty' => 'Computer Science & Engineering',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '7',
            ])
            ->assertCreated();
        $flexibleSessionId = $flexibleResponse->json('session.id');
        $temporaryLinkedId = AdHocAttendanceSession::query()
            ->findOrFail($flexibleSessionId)
            ->linked_lecture_session_id;

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson("/api/ad-hoc-attendance/{$flexibleSessionId}/students", [
                'studentId' => '20209992',
            ])
            ->assertOk();

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/ad-hoc-attendance/migrate-all', [
                'search' => 'Additive migration target',
            ])
            ->assertOk()
            ->assertJsonPath('migratedSessions', 1)
            ->assertJsonPath('migratedStudents', 1);

        $this->assertDatabaseHas('ad_hoc_attendance_sessions', [
            'id' => $flexibleSessionId,
            'status' => 'migrated',
            'linked_lecture_session_id' => $officialSession->id,
        ]);
        $this->assertDatabaseMissing('lecture_sessions', ['id' => $temporaryLinkedId]);
        $this->assertDatabaseHas('attendance_records', [
            'lecture_session_id' => $officialSession->id,
            'student_id' => 'student-1',
        ]);
        $this->assertDatabaseHas('attendance_records', [
            'lecture_session_id' => $officialSession->id,
            'student_id' => 'migration-student-2',
        ]);
        $this->assertSame(2, AttendanceRecord::query()
            ->where('lecture_session_id', $officialSession->id)
            ->count());

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS101&lectureType=Lecture&group=A&week=7')
            ->assertOk()
            ->assertJsonPath('meta.presentRecords', 2);
    }

    public function test_admin_bulk_migration_processes_every_matching_session_not_only_one_page(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();
        $sessionIds = [];

        foreach (range(1, 7) as $week) {
            $response = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/ad-hoc-attendance', [
                    'subjectName' => 'Bulk migration target',
                    'subjectCode' => 'CS101',
                    'faculty' => 'Computer Science & Engineering',
                    'lectureType' => 'Lecture',
                    'group' => 'A',
                    'week' => (string) $week,
                ])
                ->assertCreated();

            $sessionIds[] = $response->json('session.id');

            $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/ad-hoc-attendance/'.$response->json('session.id').'/students', [
                    'studentId' => '20201001',
                ])
                ->assertOk();
        }

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/ad-hoc-attendance/migration-preview?search=Bulk%20migration%20target')
            ->assertOk()
            ->assertJsonPath('eligibleCount', 7)
            ->assertJsonPath('skippedCount', 0);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/ad-hoc-attendance/migrate-all', [
                'search' => 'Bulk migration target',
            ])
            ->assertOk()
            ->assertJsonPath('eligibleCount', 7)
            ->assertJsonPath('migratedSessions', 7)
            ->assertJsonPath('migratedStudents', 7)
            ->assertJsonPath('skippedCount', 0)
            ->assertJsonPath('failedSessions', []);

        foreach ($sessionIds as $sessionId) {
            $this->assertDatabaseHas('ad_hoc_attendance_sessions', [
                'id' => $sessionId,
                'status' => 'migrated',
            ]);
        }
    }

    public function test_bulk_migration_returns_progress_for_each_requested_batch(): void
    {
        $this->artisan('migrate:fresh --seed');
        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();

        foreach (range(1, 3) as $week) {
            $response = $this->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/ad-hoc-attendance', [
                    'subjectName' => 'Batch progress target',
                    'subjectCode' => 'CS101',
                    'faculty' => 'Computer Science & Engineering',
                    'lectureType' => 'Lecture',
                    'group' => 'A',
                    'week' => (string) $week,
                ])->assertCreated();
            $this->postJson('/api/ad-hoc-attendance/'.$response->json('session.id').'/students', [
                'studentId' => '20201001',
            ])->assertOk();
        }

        $cursor = null;
        foreach (range(1, 3) as $processed) {
            $response = $this->withHeader('Authorization', "Bearer {$adminToken}")
                ->postJson('/api/ad-hoc-attendance/migrate-all', [
                    'search' => 'Batch progress target',
                    'batchSize' => 1,
                    'cursor' => $cursor,
                ])->assertOk()
                ->assertJsonPath('processedCount', 1)
                ->assertJsonPath('migratedSessions', 1)
                ->assertJsonPath('migratedStudents', 1)
                ->assertJsonPath('remainingEligible', 3 - $processed)
                ->assertJsonPath('batchComplete', $processed === 3);
            $nextCursor = $response->json('nextCursor');
            $this->assertNotEmpty($nextCursor);
            $this->assertNotSame($cursor, $nextCursor);
            $cursor = $nextCursor;
        }

        $this->postJson('/api/ad-hoc-attendance/migrate-all', [
            'search' => 'Batch progress target',
            'batchSize' => 1,
            'cursor' => $cursor,
        ])->assertOk()
            ->assertJsonPath('processedCount', 0)
            ->assertJsonPath('batchComplete', true);
    }

    public function test_report_counts_ended_sessions_and_student_attendance_by_class_type(): void
    {
        $this->artisan('migrate:fresh --seed');

        $termCode = AcademicTerm::getActiveTermCode();
        $adminToken = $this->loginAsSeededAdmin();
        StudentRegistration::query()
            ->where('user_id', 'student-1')
            ->where('subject_code', 'CS101')
            ->where('term_code', $termCode)
            ->update(['subject_name' => 'CS101']);
        CatalogSubject::query()->updateOrCreate(
            [
                'faculty_id' => 'computers-ai',
                'subject_code' => 'CS101',
                'term_code' => $termCode,
            ],
            [
                'faculty_name' => 'Computer Science & Engineering',
                'subject_name' => 'Intro to Programming',
                'group_count' => 1,
                'types' => ['Lecture'],
            ],
        );
        $firstSession = LectureSession::query()->create([
            'id' => 'report-lecture-1',
            'user_id' => 'staff-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
            'status' => 'ended',
            'started_at' => now()->subWeek(),
            'ended_at' => now()->subWeek(),
            'term_code' => $termCode,
        ]);
          $secondSession = LectureSession::query()->create([
            'id' => 'report-lecture-2',
            'user_id' => 'staff-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '2',
            'status' => 'ended',
            'started_at' => now(),
            'ended_at' => now(),
              'term_code' => $termCode,
          ]);
          $retriedFirstSession = LectureSession::query()->create([
              'id' => 'report-lecture-1-retry',
              'user_id' => 'staff-1',
              'course_code' => 'CS101',
              'lecture_type' => 'Lecture',
              'group' => 'A',
              'week' => '1',
              'status' => 'ended',
              'started_at' => now()->subWeek()->addMinute(),
              'ended_at' => now()->subWeek()->addMinute(),
              'term_code' => $termCode,
          ]);

        AttendanceRecord::query()->create([
            'lecture_session_id' => $firstSession->id,
            'student_id' => 'student-1',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
            'term_code' => $termCode,
              'scanned_at' => now()->subWeek(),
          ]);
          AttendanceRecord::query()->create([
              'lecture_session_id' => $retriedFirstSession->id,
              'student_id' => 'student-1',
              'course_code' => 'CS101',
              'lecture_type' => 'Lecture',
              'group' => 'A',
              'week' => '1',
              'term_code' => $termCode,
              'scanned_at' => now()->subWeek()->addMinute(),
          ]);

          $demoStudent = User::query()->create([
              'id' => 'student-report-demo',
              'name' => 'Demo Student',
              'full_name' => 'Demo Student',
              'email' => 'demo-report-student@example.test',
              'password' => '123456',
              'role' => 'student',
              'student_id' => '20208888',
              'university_id' => '20208888',
              'college' => 'Computer Science & Engineering',
          ]);
          StudentRegistration::query()->create([
              'user_id' => $demoStudent->id,
              'subject_code' => 'CS101',
              'subject_name' => 'Intro to Programming',
              'group' => 'A',
              'type' => 'Lecture',
              'term_code' => $termCode,
          ]);
          $emailDemoStudent = User::query()->create([
              'id' => 'student-report-email-demo',
              'name' => 'Sample Student',
              'full_name' => 'Sample Student',
              'email' => 'demo-import@example.test',
              'password' => '123456',
              'role' => 'student',
              'student_id' => '20207777',
              'university_id' => '20207777',
              'college' => 'Computer Science & Engineering',
          ]);
          StudentRegistration::query()->create([
              'user_id' => $emailDemoStudent->id,
              'subject_code' => 'CS101',
              'subject_name' => 'Intro to Programming',
              'group' => 'A',
              'type' => 'Lecture',
              'term_code' => $termCode,
          ]);
          LectureSession::query()->create([
              'id' => 'report-dot-course',
              'user_id' => 'staff-1',
              'course_code' => '.',
              'lecture_type' => 'Lecture',
              'group' => 'A',
              'week' => '1',
              'status' => 'ended',
              'started_at' => now(),
              'ended_at' => now(),
              'term_code' => $termCode,
          ]);
          StudentRegistration::query()->create([
              'user_id' => 'student-1',
              'subject_code' => '.',
              'subject_name' => '.',
              'group' => 'A',
              'type' => 'Lecture',
              'term_code' => $termCode,
          ]);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS101')
            ->assertOk()
            ->assertJsonPath('meta.totalSessions', 2)
            ->assertJsonPath('meta.totalStudents', 1)
            ->assertJsonPath('rows.0.studentId', '20201001')
            ->assertJsonPath('rows.0.courseName', 'Intro to Programming')
            ->assertJsonPath('rows.0.types.Lecture.attended', 1)
            ->assertJsonPath('rows.0.types.Lecture.total', 2)
            ->assertJsonPath('rows.0.types.Lecture.absent', 1)
            ->assertJsonPath('rows.0.types.Lecture.weeks', ['1'])
            ->assertJsonPath('rows.0.overall.attendanceRate', 50)
            ->assertJsonPath('rows.0.status', 'warning')
            ->assertJsonMissing(['courseCode' => '.']);

        User::query()->create([
            'id' => 'student-report-unregistered',
            'name' => 'Unregistered Report Student',
            'full_name' => 'Unregistered Report Student',
            'email' => 'unregistered-report-student@example.test',
            'password' => '123456',
            'role' => 'student',
            'student_id' => '20209999',
            'university_id' => '20209999',
            'college' => 'Computer Science & Engineering',
        ]);
        AttendanceRecord::query()->create([
            'lecture_session_id' => $secondSession->id,
            'student_id' => 'student-report-unregistered',
            'course_code' => 'CS101',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '2',
            'term_code' => $termCode,
            'scanned_at' => now(),
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS101&ignoreRegistration=1')
            ->assertOk()
            ->assertJsonPath('meta.totalStudents', 2)
            ->assertJsonFragment([
                'studentId' => '20209999',
                'courseName' => 'Intro to Programming',
                'isRegistered' => false,
            ]);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS101&ignoreRegistration=1&perPage=1&page=1')
            ->assertOk()
            ->assertJsonPath('meta.pagination.lastPage', 2)
            ->assertJsonPath('meta.totalStudents', 2)
            ->assertJsonCount(1, 'rows');

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS101&ignoreRegistration=1&perPage=1&page=2')
            ->assertOk()
            ->assertJsonPath('rows.0.studentId', '20209999')
            ->assertJsonPath('rows.0.isRegistered', false);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report-options')
            ->assertOk()
            ->assertJsonFragment(['subjectCode' => 'CS101']);

        $this->assertDatabaseHas('lecture_sessions', ['id' => $secondSession->id, 'status' => 'ended']);
    }

    public function test_report_row_pagination_counts_courses_and_includes_open_attended_sessions(): void
    {
        $this->artisan('migrate:fresh --seed');
        $termCode = AcademicTerm::getActiveTermCode();
        $adminToken = $this->loginAsSeededAdmin();

        foreach (['CS901', 'CS902'] as $code) {
            StudentRegistration::query()->create([
                'user_id' => 'student-1',
                'subject_code' => $code,
                'subject_name' => $code,
                'group' => 'A',
                'type' => 'Lecture',
                'term_code' => $termCode,
            ]);
        }
        $session = LectureSession::query()->create([
            'id' => 'report-open-attended',
            'user_id' => 'staff-1',
            'course_code' => 'CS901',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
            'status' => 'active',
            'started_at' => now(),
            'term_code' => $termCode,
        ]);
        AttendanceRecord::query()->create([
            'lecture_session_id' => $session->id,
            'student_id' => 'student-1',
            'course_code' => 'CS901',
            'lecture_type' => 'Lecture',
            'group' => 'A',
            'week' => '1',
            'term_code' => $termCode,
            'scanned_at' => now(),
        ]);

        $first = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?paginateRows=1&perPage=1&page=1');
        $first->assertOk()->assertJsonPath('meta.pagination.lastPage', 3)->assertJsonCount(1, 'rows');
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?paginateRows=1&perPage=1&page=2')
            ->assertOk()
            ->assertJsonCount(1, 'rows');
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/attendance/report?courseCode=CS901&paginateRows=1&perPage=10')
            ->assertOk()
            ->assertJsonPath('rows.0.types.Lecture.attended', 1)
            ->assertJsonPath('rows.0.types.Lecture.total', 1)
            ->assertJsonPath('rows.0.overall.attendanceRate', 100);
    }

    public function test_report_preserves_attended_weeks_after_student_changes_group(): void
    {
        $this->artisan('migrate:fresh --seed');

        $termCode = AcademicTerm::getActiveTermCode();
        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();

        StudentRegistration::query()
            ->where('user_id', 'student-1')
            ->where('subject_code', 'CS101')
            ->where('term_code', $termCode)
            ->where('type', 'Lecture')
            ->update(['group' => 'C']);

        foreach ([1 => 'A', 2 => 'B', 3 => 'C'] as $week => $group) {
            $session = LectureSession::query()->create([
                'id' => "report-group-change-{$week}",
                'user_id' => 'staff-1',
                'course_code' => 'CS101',
                'lecture_type' => 'Lecture',
                'group' => $group,
                'week' => (string) $week,
                'status' => 'ended',
                'started_at' => now()->subDays(4 - $week),
                'ended_at' => now()->subDays(4 - $week)->addHour(),
                'term_code' => $termCode,
            ]);

            AttendanceRecord::query()->create([
                'lecture_session_id' => $session->id,
                'student_id' => 'student-1',
                'course_code' => 'CS101',
                'lecture_type' => 'Lecture',
                'group' => $group,
                'week' => (string) $week,
                'term_code' => $termCode,
                'scanned_at' => now()->subDays(4 - $week)->addMinutes(10),
            ]);
        }

        foreach ([$adminToken, $staffToken] as $token) {
            $this
                ->withHeader('Authorization', "Bearer {$token}")
                ->getJson('/api/attendance/report?courseCode=CS101&lectureType=Lecture')
                ->assertOk()
                ->assertJsonPath('meta.totalSessions', 3)
                ->assertJsonPath('rows.0.studentId', '20201001')
                ->assertJsonPath('rows.0.types.Lecture.attended', 3)
                ->assertJsonPath('rows.0.types.Lecture.total', 3)
                ->assertJsonPath('rows.0.types.Lecture.weeks', ['1', '2', '3'])
                ->assertJsonPath('rows.0.overall.attendanceRate', 100);
        }
    }

    public function test_terms_keep_accounts_global_and_scope_student_and_staff_data(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();
        $previousTermCode = AcademicTerm::getActiveTermCode();

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/terms', [
                'code' => 'FALL-2026-2027',
                'name' => 'Fall 2026/2027',
                'academicYear' => '2026/2027',
                'isActive' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.code', 'FALL-2026-2027')
            ->assertJsonPath('data.isActive', true);

        CatalogSubject::query()->create([
            'faculty_id' => 'computers-ai',
            'faculty_name' => 'Faculty of Computers and Artificial Intelligence',
            'subject_code' => 'CS201',
            'subject_name' => 'Data Structures',
            'group_count' => 6,
            'group_counts' => ['Lecture' => 6, 'Section' => 6, 'Practical' => 6],
            'types' => ['Lecture', 'Section', 'Practical'],
            'term_code' => 'FALL-2026-2027',
        ]);

        $this->assertDatabaseHas('student_registrations', [
            'user_id' => 'student-1',
            'subject_code' => 'CS101',
            'term_code' => $previousTermCode,
        ]);

        $this
            ->withHeaders([
                'Authorization' => "Bearer {$adminToken}",
                'X-Academic-Term' => 'FALL-2026-2027',
            ])
            ->getJson('/api/students')
            ->assertOk()
            ->assertJsonPath('students.0.id', 'student-1')
            ->assertJsonCount(0, 'students.0.registrations');

        $this
            ->withHeaders([
                'Authorization' => "Bearer {$adminToken}",
                'X-Academic-Term' => 'FALL-2026-2027',
            ])
            ->putJson('/api/students/student-1', [
                'name' => 'Seed Student',
                'studentId' => '20201001',
                'nationalId' => '29901011234566',
                'college' => 'Computer Science & Engineering',
                'registrations' => [
                    ['subjectCode' => 'CS201', 'group' => 'B', 'type' => 'Section'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('registrations.0.subjectCode', 'CS201')
            ->assertJsonPath('registrations.0.termCode', 'FALL-2026-2027');

        $this->assertDatabaseHas('student_registrations', [
            'user_id' => 'student-1',
            'subject_code' => 'CS101',
            'term_code' => $previousTermCode,
        ]);
        $this->assertDatabaseHas('student_registrations', [
            'user_id' => 'student-1',
            'subject_code' => 'CS201',
            'term_code' => 'FALL-2026-2027',
        ]);

        $this
            ->withHeaders([
                'Authorization' => "Bearer {$adminToken}",
                'X-Academic-Term' => $previousTermCode,
            ])
            ->getJson('/api/students')
            ->assertOk()
            ->assertJsonPath('students.0.registrations.0.subjectCode', 'CS101');

        $courseResponse = $this
            ->withHeaders([
                'Authorization' => "Bearer {$adminToken}",
                'X-Academic-Term' => 'FALL-2026-2027',
            ])
            ->postJson('/api/admin/staff/staff-1/courses', [
                'uid' => 'CS201-SECTION',
                'id' => 'CS201',
                'name' => 'Data Structures',
                'faculty' => 'computers-ai',
                'college' => 'cs',
                'type' => 'Section',
            ])
            ->assertOk()
            ->assertJsonPath('courses.0.termCode', 'FALL-2026-2027');

        $this
            ->withHeaders([
                'Authorization' => "Bearer {$staffToken}",
                'X-Academic-Term' => $previousTermCode,
            ])
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS101',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
            ])
            ->assertStatus(409);

        $sessionResponse = $this
            ->withHeaders([
                'Authorization' => "Bearer {$staffToken}",
                'X-Academic-Term' => 'FALL-2026-2027',
            ])
            ->postJson('/api/lecture-sessions', [
                'courseCode' => 'CS201',
                'lectureType' => 'Section',
                'group' => 'B',
                'week' => '1',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('lecture_sessions', [
            'id' => $sessionResponse->json('session.id'),
            'term_code' => 'FALL-2026-2027',
        ]);
    }

    public function test_staff_must_be_granted_permission_to_view_historical_terms(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();
        $historicalTermCode = AcademicTerm::getActiveTermCode();

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/terms', [
                'code' => 'FALL-2026-2027',
                'name' => 'Fall 2026/2027',
                'academicYear' => '2026/2027',
                'isActive' => true,
            ])
            ->assertCreated();

        $this
            ->withHeaders([
                'Authorization' => "Bearer {$staffToken}",
                'X-Academic-Term' => $historicalTermCode,
            ])
            ->getJson('/api/lecture-sessions')
            ->assertForbidden();

        $staff = User::query()->findOrFail('staff-1');
        $staff->permissions = [
            ...Permissions::STAFF,
            Permissions::SELECT_ACADEMIC_TERM,
        ];
        $staff->save();

        $this
            ->withHeaders([
                'Authorization' => "Bearer {$staffToken}",
                'X-Academic-Term' => $historicalTermCode,
            ])
            ->getJson('/api/lecture-sessions')
            ->assertOk();
    }

    public function test_student_can_view_profile_history_and_terms_for_a_historical_term(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $studentToken = $this->loginAsSeededStudent('test-device-historical-term');
        $historicalTermCode = AcademicTerm::getActiveTermCode();

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/terms', [
                'code' => 'FALL-2026-2027',
                'name' => 'Fall 2026/2027',
                'academicYear' => '2026/2027',
                'isActive' => true,
            ])
            ->assertCreated();

        $headers = [
            'Authorization' => "Bearer {$studentToken}",
            'X-Academic-Term' => $historicalTermCode,
        ];

        $this->withHeaders($headers)->getJson('/api/terms')->assertOk();
        $this->withHeaders($headers)->getJson('/api/auth/me')->assertOk();
        $this->withHeaders($headers)->getJson('/api/attendance/my')->assertOk();
    }

    public function test_academic_management_pages_use_their_own_permissions(): void
    {
        $this->artisan('migrate:fresh --seed');

        $staffToken = $this->loginAsSeededStaff();

        $termPayload = [
            'code' => 'SPRING-2027-2028',
            'name' => 'Spring 2027/2028',
            'academicYear' => '2027/2028',
            'isActive' => false,
        ];
        $catalogPayload = [
            'facultyId' => 'engineering',
            'subjectName' => 'Networks',
            'subjectCode' => 'CS330',
            'groupCount' => 2,
            'types' => ['Lecture', 'Section'],
        ];

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/admin/terms', $termPayload)
            ->assertForbidden();

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/admin/catalog/subjects', $catalogPayload)
            ->assertForbidden();

        $staff = User::query()->findOrFail('staff-1');
        $staff->permissions = [...Permissions::STAFF, Permissions::MANAGE_ACADEMIC_TERMS];
        $staff->save();

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/admin/terms', $termPayload)
            ->assertCreated();

        $staff->permissions = [...Permissions::STAFF, Permissions::MANAGE_SUBJECT_CATALOG];
        $staff->save();

        $this
            ->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/admin/catalog/subjects', $catalogPayload)
            ->assertCreated()
            ->assertJsonPath('subject.subjectCode', 'CS330');
    }

    public function test_catalog_subject_type_group_counts_and_identity_changes_cascade_to_attendance_data(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $termCode = AcademicTerm::getActiveTermCode();
        $createResponse = $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/catalog/subjects', [
                'facultyId' => 'computers-ai',
                'subjectName' => 'Legacy Networks',
                'subjectCode' => 'NET100',
                'groupCount' => 5,
                'groupCounts' => ['Lecture' => 2, 'Section' => 5, 'Practical' => 3],
                'types' => ['Lecture', 'Section', 'Practical'],
            ])
            ->assertCreated()
            ->assertJsonPath('subject.groupCounts.Lecture', 2)
            ->assertJsonPath('subject.groupCounts.Section', 5)
            ->assertJsonPath('subject.groupCounts.Practical', 3);

        $catalogSubjectId = $createResponse->json('subject.id');
        DB::table('student_registrations')->insert([
            'user_id' => 'student-1', 'subject_code' => 'NET100', 'subject_name' => 'Legacy Networks',
            'group' => 'A', 'type' => 'Lecture', 'term_code' => $termCode, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('course_assignments')->insert([
            'uid' => 'cascade-course-assignment', 'user_id' => 'staff-1', 'course_id' => 'NET100',
            'name' => 'Legacy Networks', 'faculty' => 'computers-ai', 'type' => 'Lecture',
            'term_code' => $termCode, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $lectureSession = LectureSession::query()->create([
            'id' => 'cascade-catalog-session', 'user_id' => 'staff-1', 'course_code' => 'NET100',
            'lecture_type' => 'Lecture', 'group' => 'A', 'week' => '1', 'status' => 'ended',
            'started_at' => now(), 'ended_at' => now(), 'term_code' => $termCode,
        ]);
        AttendanceRecord::query()->create([
            'lecture_session_id' => $lectureSession->id, 'student_id' => 'student-1', 'course_code' => 'NET100',
            'lecture_type' => 'Lecture', 'group' => 'A', 'week' => '1', 'term_code' => $termCode, 'scanned_at' => now(),
        ]);
        AdHocAttendanceSession::query()->create([
            'id' => 'cascade-flexible-session', 'user_id' => 'staff-1', 'subject_name' => 'Legacy Networks',
            'subject_code' => 'NET100', 'faculty' => 'computers-ai', 'lecture_type' => 'Lecture',
            'group' => 'A', 'week' => '1', 'status' => 'migrated', 'migrated_to_course_code' => 'NET100',
            'linked_lecture_session_id' => $lectureSession->id, 'term_code' => $termCode,
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/admin/catalog/subjects/{$catalogSubjectId}", [
                'facultyId' => 'computers-ai',
                'subjectName' => 'Advanced Networks',
                'subjectCode' => 'NET200',
                'groupCount' => 6,
                'groupCounts' => ['Lecture' => 3, 'Section' => 6, 'Practical' => 2],
                'types' => ['Lecture', 'Section', 'Practical'],
            ])
            ->assertOk()
            ->assertJsonPath('subject.subjectCode', 'NET200')
            ->assertJsonPath('subject.subjectName', 'Advanced Networks')
            ->assertJsonPath('subject.groupCounts.Lecture', 3)
            ->assertJsonPath('subject.groupCounts.Section', 6)
            ->assertJsonPath('subject.groupCounts.Practical', 2);

        $this->assertDatabaseHas('student_registrations', ['subject_code' => 'NET200', 'subject_name' => 'Advanced Networks', 'term_code' => $termCode]);
        $this->assertDatabaseHas('course_assignments', ['course_id' => 'NET200', 'name' => 'Advanced Networks', 'term_code' => $termCode]);
        $this->assertDatabaseHas('lecture_sessions', ['id' => $lectureSession->id, 'course_code' => 'NET200']);
        $this->assertDatabaseHas('attendance_records', ['lecture_session_id' => $lectureSession->id, 'course_code' => 'NET200']);
        $this->assertDatabaseHas('ad_hoc_attendance_sessions', [
            'id' => 'cascade-flexible-session', 'subject_code' => 'NET200', 'subject_name' => 'Advanced Networks',
            'migrated_to_course_code' => 'NET200',
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/catalog/subjects/import', [
                'facultyId' => 'computers-ai',
                'subjects' => [[
                    'subjectName' => 'Enterprise Networks',
                    'subjectCode' => 'NET300',
                    'originalSubjectCode' => 'NET200',
                    'groupCount' => 7,
                    'groupCounts' => ['Lecture' => 2, 'Section' => 7, 'Practical' => 4],
                    'types' => ['Lecture', 'Section', 'Practical'],
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('summary.updated', 1);

        $this->assertDatabaseHas('catalog_subjects', [
            'id' => $catalogSubjectId, 'subject_code' => 'NET300', 'subject_name' => 'Enterprise Networks',
        ]);
        $this->assertDatabaseHas('student_registrations', ['subject_code' => 'NET300', 'subject_name' => 'Enterprise Networks']);
        $this->assertDatabaseHas('course_assignments', ['course_id' => 'NET300', 'name' => 'Enterprise Networks']);
        $this->assertDatabaseHas('lecture_sessions', ['id' => $lectureSession->id, 'course_code' => 'NET300']);
        $this->assertDatabaseHas('attendance_records', ['lecture_session_id' => $lectureSession->id, 'course_code' => 'NET300']);
    }

    public function test_flexible_attendance_admin_list_is_paginated_and_loads_rosters_on_demand(): void
    {
        $this->artisan('migrate:fresh --seed');

        $adminToken = $this->loginAsSeededAdmin();
        $staffToken = $this->loginAsSeededStaff();
        $sessionIds = [];

        foreach (['CS401', 'CS402', 'CS403'] as $subjectCode) {
            StudentRegistration::query()->create([
                'user_id' => 'student-1',
                'subject_code' => $subjectCode,
                'subject_name' => "Subject {$subjectCode}",
                'group' => 'A',
                'type' => 'Lecture',
                'term_code' => AcademicTerm::getActiveTermCode(),
            ]);

            $response = $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson('/api/ad-hoc-attendance', [
                    'subjectName' => "Subject {$subjectCode}",
                    'subjectCode' => $subjectCode,
                    'faculty' => 'Computer Science & Engineering',
                    'lectureType' => 'Lecture',
                    'group' => 'A',
                    'week' => '1',
                ])
                ->assertCreated();

            $sessionIds[] = $response->json('session.id');
        }

        foreach ($sessionIds as $sessionId) {
            $this
                ->withHeader('Authorization', "Bearer {$staffToken}")
                ->postJson("/api/ad-hoc-attendance/{$sessionId}/students", [
                    'studentId' => '20201001',
                ])
                ->assertOk();
        }

        $listResponse = $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/ad-hoc-attendance?page=1&perPage=2')
            ->assertOk()
            ->assertJsonCount(2, 'sessions')
            ->assertJsonPath('pagination.currentPage', 1)
            ->assertJsonPath('pagination.totalPages', 2)
            ->assertJsonPath('pagination.total', 3);

        $summary = $listResponse->json('sessions.0');
        $this->assertSame([], $summary['records']);
        $this->assertSame(1, $summary['recordCount']);

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson("/api/ad-hoc-attendance/{$summary['id']}")
            ->assertOk()
            ->assertJsonPath('session.id', $summary['id'])
            ->assertJsonPath('session.recordCount', 1)
            ->assertJsonCount(1, 'session.records');
    }

    public function test_flexible_session_automatically_closes_after_ten_minutes_and_still_allows_manual_addition(): void
    {
        $this->artisan('migrate:fresh --seed');
        $staffToken = $this->loginAsSeededStaff();

        $created = $this->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/ad-hoc-attendance', [
                'subjectName' => 'Automatic expiry',
                'subjectCode' => 'CS101',
                'faculty' => 'Computer Science & Engineering',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
            ])->assertCreated();

        $sessionId = $created->json('session.id');
        $linkedSessionId = $created->json('session.linkedLectureSessionId');
        $this->travel(10)->minutes();

        $this->getJson("/api/ad-hoc-attendance/{$sessionId}/qr-token")
            ->assertStatus(409);
        $this->assertDatabaseHas('ad_hoc_attendance_sessions', [
            'id' => $sessionId,
            'status' => 'closed',
        ]);
        $this->assertDatabaseHas('lecture_sessions', [
            'id' => $linkedSessionId,
            'status' => 'ended',
        ]);

        $this->postJson("/api/ad-hoc-attendance/{$sessionId}/students", [
            'studentId' => '20201001',
        ])->assertOk();
    }

    public function test_reopening_a_flexible_session_starts_a_new_ten_minute_window(): void
    {
        $this->artisan('migrate:fresh --seed');
        $staffToken = $this->loginAsSeededStaff();

        $created = $this->withHeader('Authorization', "Bearer {$staffToken}")
            ->postJson('/api/ad-hoc-attendance', [
                'subjectName' => 'Renewed expiry',
                'subjectCode' => 'CS101',
                'faculty' => 'Computer Science & Engineering',
                'lectureType' => 'Lecture',
                'group' => 'A',
                'week' => '1',
            ])->assertCreated();

        $sessionId = $created->json('session.id');
        $originalStartedAt = $created->json('session.startedAt');
        $this->travel(10)->minutes();
        $this->getJson("/api/ad-hoc-attendance/{$sessionId}")
            ->assertOk()
            ->assertJsonPath('session.status', 'closed');

        $reopened = $this->postJson("/api/ad-hoc-attendance/{$sessionId}/reopen")
            ->assertOk()
            ->assertJsonPath('session.status', 'open');
        $this->assertNotSame($originalStartedAt, $reopened->json('session.startedAt'));

        $this->travel(9)->minutes();
        $this->getJson("/api/ad-hoc-attendance/{$sessionId}/qr-token")->assertOk();
        $this->travel(1)->minutes();
        $this->getJson("/api/ad-hoc-attendance/{$sessionId}/qr-token")->assertStatus(409);
    }

    private function loginAsSeededAdmin(): string
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'a',
            'password' => '123',
            'role' => 'admin',
            'language' => 'en',
        ]);

        return $response->json('token');
    }

    private function ensureSeededStaffCatalogSubject(): void
    {
        CatalogSubject::query()->updateOrCreate(
            [
                'faculty_id' => 'engineering',
                'subject_code' => 'CS101',
                'term_code' => AcademicTerm::getActiveTermCode(),
            ],
            [
                'faculty_name' => 'Faculty of Engineering',
                'subject_name' => 'Intro to Programming',
                'group_count' => 6,
                'group_counts' => ['Lecture' => 6, 'Section' => 6, 'Practical' => 6],
                'types' => ['Lecture', 'Section', 'Practical'],
            ],
        );
    }

    private function loginAsSeededStaff(): string
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'staff',
            'password' => '123',
            'role' => 'staff',
            'language' => 'en',
        ]);

        return $response->json('token');
    }

    private function loginAsSeededStudent(string $deviceIdentifier): string
    {
        $response = $this->withHeader('X-Requested-With', 'XMLHttpRequest')->postJson('/api/auth/login', [
            'email' => 'student',
            'password' => '123',
            'role' => 'student',
            'language' => 'en',
            'deviceIdentifier' => $deviceIdentifier,
        ]);

        $cookie = collect($response->headers->getCookies())
            ->first(fn ($candidate) => $candidate->getName() === \App\Services\Auth\StudentRefreshSessionService::COOKIE_NAME);
        if ($cookie) {
            $this->studentRefreshTokens[$deviceIdentifier] = $cookie->getValue();
        }

        return $response->json('token');
    }

    private function refreshSeededStudentToken(string $deviceIdentifier): string
    {
        $response = $this
            ->withCredentials()
            ->withHeader('X-Requested-With', 'XMLHttpRequest')
            ->withUnencryptedCookie(
                \App\Services\Auth\StudentRefreshSessionService::COOKIE_NAME,
                $this->studentRefreshTokens[$deviceIdentifier] ?? '',
            )
            ->postJson('/api/auth/refresh')
            ->assertOk();

        $cookie = collect($response->headers->getCookies())
            ->first(fn ($candidate) => $candidate->getName() === \App\Services\Auth\StudentRefreshSessionService::COOKIE_NAME);
        if ($cookie) {
            $this->studentRefreshTokens[$deviceIdentifier] = $cookie->getValue();
        }

        return $response->json('token');
    }
}
