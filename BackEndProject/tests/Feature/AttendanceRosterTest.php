<?php

namespace Tests\Feature;

use App\Models\AcademicTerm;
use App\Models\AdHocAttendanceSession;
use App\Models\AttendanceRecord;
use App\Models\LectureSession;
use App\Models\StudentRegistration;
use App\Models\SystemSetting;
use App\Models\User;
use Tests\TestCase;

class AttendanceRosterTest extends TestCase
{
    private string $token;

    private string $term;

    private LectureSession $session;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate:fresh --seed');
        $this->term = AcademicTerm::getActiveTermCode();
        $this->token = $this->postJson('/api/auth/login', ['email' => 'staff', 'password' => '123', 'role' => 'staff'])->assertOk()->json('token');
        $this->withHeader('Authorization', 'Bearer '.$this->token);
        $this->session = LectureSession::create([
            'id' => 'roster-session', 'user_id' => 'staff-1', 'course_code' => 'CS101',
            'lecture_type' => 'Lecture', 'group' => 'A', 'week' => '1',
            'term_code' => $this->term, 'status' => 'ended', 'started_at' => now(), 'ended_at' => now(),
        ]);
    }

    private function enable(array $overrides = []): void
    {
        SystemSetting::updateOrCreate(['key' => 'attendance_roster_options'], ['value' => array_replace([
            'enabled' => true, 'allDoctors' => true, 'doctorIds' => [], 'dashboard' => true, 'flexible' => true,
        ], $overrides)]);
    }

    private function url(string $mode = 'dashboard', string $id = 'roster-session'): string
    {
        return '/api/attendance-roster/'.$mode.'/'.$id;
    }

    public function test_feature_is_off_by_default_and_does_not_disable_existing_manual_entry(): void
    {
        $this->getJson('/api/attendance-roster/options')->assertOk()->assertJsonPath('data.dashboard', false);
        $this->getJson($this->url())->assertForbidden();
        $this->postJson($this->url(), ['studentIds' => ['student-1']])->assertForbidden();
        $this->postJson('/api/attendance/manual', $this->manualPayload())->assertCreated();
        $this->assertDatabaseCount('attendance_records', 1);
    }

    private function manualPayload(): array
    {
        return ['studentId' => 'student-1', 'lectureSessionId' => $this->session->id,
            'courseCode' => 'CS101', 'lectureType' => 'Lecture', 'group' => 'A', 'week' => '1'];
    }

    public function test_only_authorized_admin_can_manage_settings_and_student_accounts_cannot_be_selected_as_doctors(): void
    {
        $options = ['enabled' => true, 'allDoctors' => false, 'doctorIds' => ['staff-1'], 'dashboard' => true, 'flexible' => false];
        $this->putJson('/api/admin/settings/attendance-roster', $options)->assertForbidden();
        $admin = $this->postJson('/api/auth/login', ['email' => 'a', 'password' => '123', 'role' => 'admin'])->assertOk()->json('token');
        $this->withHeader('Authorization', 'Bearer '.$admin)->putJson('/api/admin/settings/attendance-roster', $options)->assertOk();
        $this->putJson('/api/admin/settings/attendance-roster', array_replace($options, ['doctorIds' => ['student-1']]))->assertUnprocessable();
        User::findOrFail('admin-1')->update(['is_system' => false, 'permissions' => []]);
        $this->putJson('/api/admin/settings/attendance-roster', $options)->assertForbidden();
        $this->withHeader('Authorization', 'Bearer '.$this->token)->getJson('/api/attendance-roster/options')
            ->assertOk()->assertJsonPath('data.dashboard', true)->assertJsonPath('data.flexible', false);
    }

    public function test_account_mode_owner_and_term_restrictions_are_checked_on_the_server(): void
    {
        $this->enable(['allDoctors' => false, 'doctorIds' => []]);
        $this->getJson($this->url())->assertForbidden();
        $this->enable(['dashboard' => false]);
        $this->getJson($this->url())->assertForbidden();
        $this->enable();
        $this->session->update(['user_id' => 'admin-1']);
        $this->getJson($this->url())->assertNotFound();
        $this->session->update(['user_id' => 'staff-1', 'term_code' => 'OTHER-TERM']);
        $this->getJson($this->url())->assertNotFound();
        $this->postJson($this->url(), ['studentIds' => ['student-1']])->assertNotFound();
        $this->assertDatabaseCount('attendance_records', 0);
    }

    public function test_roster_filters_registration_and_search_and_handles_all_groups(): void
    {
        $this->enable();
        $this->getJson($this->url())->assertOk()->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', 'student-1')
            ->assertJsonPath('data.0.nationalId', '29801011234567')
            ->assertJsonPath('data.0.groups.0', 'A')
            ->assertJsonPath('data.0.isRegistered', true);
        $this->getJson($this->url().'?search=missing')->assertOk()->assertJsonPath('total', 0);
        $this->getJson($this->url().'?search=29801011234567')->assertOk()->assertJsonPath('total', 1);
        $academicId = User::findOrFail('student-1')->university_id;
        $this->getJson($this->url().'?search='.urlencode($academicId))->assertOk()->assertJsonPath('total', 1);
        StudentRegistration::where('user_id', 'student-1')->update(['group' => 'B', 'type' => 'Section']);
        $this->getJson($this->url())->assertOk()->assertJsonPath('total', 0);
        $this->session->update(['allow_all_groups' => true]);
        $this->getJson($this->url())->assertOk()->assertJsonPath('total', 1);
        $this->getJson($this->url().'?group=A')->assertOk()->assertJsonPath('total', 0);
        $this->postJson($this->url(), ['studentIds' => ['student-1']])->assertOk()->assertJsonPath('results.0.status', 'added');
        $this->assertDatabaseHas('attendance_records', ['group' => 'A', 'lecture_type' => 'Lecture']);
    }

    public function test_registration_is_rechecked_and_partial_failures_do_not_block_valid_students(): void
    {
        $this->enable();
        $this->postJson($this->url(), ['studentIds' => ['missing-student', 'student-1']])->assertOk()
            ->assertJsonPath('results.0.status', 'failed')->assertJsonPath('results.1.status', 'added');
        $this->assertDatabaseCount('attendance_records', 1);
        AttendanceRecord::query()->delete();
        StudentRegistration::where('user_id', 'student-1')->update(['group' => 'B']);
        $this->postJson($this->url(), ['studentIds' => ['student-1']])->assertOk()->assertJsonPath('results.0.status', 'failed');
        $this->assertDatabaseCount('attendance_records', 0);
    }

    public function test_manual_and_roster_produce_identical_report_rows_and_no_duplicates_on_retry(): void
    {
        $this->enable();
        $this->postJson('/api/attendance/manual', $this->manualPayload())->assertCreated();
        $manualReport = $this->getJson('/api/attendance/report?courseCode=CS101')->assertOk()->json('rows');
        $this->assertNotEmpty($manualReport);
        AttendanceRecord::query()->delete();
        $this->postJson($this->url(), ['studentIds' => ['student-1']])->assertOk()->assertJsonPath('results.0.status', 'added');
        $rosterReport = $this->getJson('/api/attendance/report?courseCode=CS101')->assertOk()->json('rows');
        $this->assertSame($manualReport, $rosterReport);
        $this->getJson($this->url())->assertOk()->assertJsonPath('data.0.present', true);
        // Simulates a scan completing after the roster was loaded, or a retried request.
        $before = AttendanceRecord::first()->scanned_at->toISOString();
        $this->postJson($this->url(), ['studentIds' => ['student-1']])->assertOk()->assertJsonPath('results.0.status', 'existing');
        $this->assertDatabaseCount('attendance_records', 1);
        $this->assertSame($before, AttendanceRecord::first()->scanned_at->toISOString());
    }

    public function test_weekly_attendance_in_another_group_is_shown_as_existing(): void
    {
        $this->enable();
        $this->postJson('/api/attendance/manual', $this->manualPayload())->assertCreated();
        $this->session->update(['group' => 'B']);
        $second = $this->session->replicate();
        $second->id = 'second-session';
        $second->group = 'A';
        $second->save();
        $this->getJson($this->url('dashboard', 'second-session'))->assertOk()->assertJsonPath('data.0.present', true);
        $this->postJson($this->url('dashboard', 'second-session'), ['studentIds' => ['student-1']])->assertOk()->assertJsonPath('results.0.status', 'existing');
        $this->assertDatabaseCount('attendance_records', 1);
    }

    private function flexible(): AdHocAttendanceSession
    {
        User::whereKey('staff-1')->update(['require_flexible_student_registration' => true]);

        return AdHocAttendanceSession::create([
            'id' => 'flex-roster', 'user_id' => 'staff-1', 'subject_name' => 'Programming', 'subject_code' => 'CS101',
            'faculty' => 'computers-ai', 'lecture_type' => 'Lecture', 'group' => 'A', 'week' => '1',
            'term_code' => $this->term, 'status' => 'open', 'started_at' => now(),
        ]);
    }

    public function test_flexible_roster_requires_faculty_subject_and_type_but_includes_all_registered_groups(): void
    {
        $this->enable();
        $session = $this->flexible();
        $outsideFaculty = User::findOrFail('student-1')->replicate();
        $outsideFaculty->id = 'engineering-student';
        $outsideFaculty->email = 'engineering-student@example.test';
        $outsideFaculty->student_id = 'engineering-student';
        $outsideFaculty->university_id = 'engineering-student';
        $outsideFaculty->national_id = 'engineering-national';
        $outsideFaculty->college = 'Faculty of Engineering';
        $outsideFaculty->save();
        StudentRegistration::create([
            'user_id' => $outsideFaculty->id,
            'subject_code' => 'CS101',
            'subject_name' => 'Intro to Programming',
            'group' => 'A',
            'type' => 'Lecture',
            'term_code' => $this->term,
        ]);
        $wrongGroup = User::findOrFail('student-1')->replicate();
        $wrongGroup->id = 'wrong-group-student';
        $wrongGroup->email = 'wrong-group-student@example.test';
        $wrongGroup->student_id = 'wrong-group-student';
        $wrongGroup->university_id = 'wrong-group-student';
        $wrongGroup->national_id = 'wrong-group-national';
        $wrongGroup->save();
        StudentRegistration::create([
            'user_id' => $wrongGroup->id,
            'subject_code' => 'CS101',
            'subject_name' => 'Intro to Programming',
            'group' => 'B',
            'type' => 'Lecture',
            'term_code' => $this->term,
        ]);
        $wrongType = User::findOrFail('student-1')->replicate();
        $wrongType->id = 'wrong-type-student';
        $wrongType->email = 'wrong-type-student@example.test';
        $wrongType->student_id = 'wrong-type-student';
        $wrongType->university_id = 'wrong-type-student';
        $wrongType->national_id = 'wrong-type-national';
        $wrongType->save();
        StudentRegistration::create([
            'user_id' => $wrongType->id,
            'subject_code' => 'CS101',
            'subject_name' => 'Intro to Programming',
            'group' => 'A',
            'type' => 'Section',
            'term_code' => $this->term,
        ]);

        $this->getJson($this->url('flexible', $session->id))
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', 'student-1');
        $this->postJson($this->url('flexible', $session->id), ['studentIds' => [$wrongGroup->id]])
            ->assertOk()
            ->assertJsonPath('results.0.status', 'failed');

        $session->update(['allow_all_groups' => true]);
        $response = $this->getJson($this->url('flexible', $session->id))
            ->assertOk()
            ->assertJsonPath('total', 2);
        $this->assertEqualsCanonicalizing(
            ['student-1', 'wrong-group-student'],
            collect($response->json('data'))->pluck('id')->all(),
        );
        $this->postJson($this->url('flexible', $session->id), ['studentIds' => [$wrongGroup->id]])
            ->assertOk()
            ->assertJsonPath('results.0.status', 'added');
        $this->postJson($this->url('flexible', $session->id), ['studentIds' => [$outsideFaculty->id]])
            ->assertOk()
            ->assertJsonPath('results.0.status', 'failed');
        $this->postJson('/api/ad-hoc-attendance/'.$session->id.'/students', ['studentId' => $outsideFaculty->national_id])
            ->assertUnprocessable();
    }

    public function test_flexible_selection_syncs_official_records_and_preserves_reports_after_disabling(): void
    {
        $this->enable();
        $session = $this->flexible();
        $this->getJson($this->url('flexible', $session->id))->assertOk()->assertJsonPath('total', 1);
        $this->postJson($this->url('flexible', $session->id), ['studentIds' => ['student-1']])->assertOk()->assertJsonPath('results.0.status', 'added');
        $this->assertDatabaseCount('ad_hoc_attendance_records', 1);
        $this->assertDatabaseCount('attendance_records', 1);
        $this->assertSame($session->fresh()->linked_lecture_session_id, AttendanceRecord::first()->lecture_session_id);
        $report = $this->getJson('/api/attendance/report?courseCode=CS101')->assertOk()->json('rows');
        $this->assertNotEmpty($report);
        $this->postJson($this->url('flexible', $session->id), ['studentIds' => ['student-1']])->assertOk()->assertJsonPath('results.0.status', 'existing');
        $this->enable(['enabled' => false]);
        $this->postJson($this->url('flexible', $session->id), ['studentIds' => ['student-1']])->assertForbidden();
        $this->assertSame($report, $this->getJson('/api/attendance/report?courseCode=CS101')->assertOk()->json('rows'));
        $this->assertDatabaseCount('ad_hoc_attendance_records', 1);
        $this->assertDatabaseCount('attendance_records', 1);
    }

    public function test_admin_views_the_same_session_after_attendance_is_recorded_without_migration(): void
    {
        $this->enable();
        $session = $this->flexible();
        $this->postJson($this->url('flexible', $session->id), ['studentIds' => ['student-1']])
            ->assertOk()
            ->assertJsonPath('results.0.status', 'added');

        $this->assertDatabaseHas('ad_hoc_attendance_sessions', [
            'id' => $session->id,
            'status' => 'open',
        ]);
        $this->assertDatabaseHas('attendance_records', [
            'student_id' => 'student-1',
            'course_code' => 'CS101',
            'week' => '1',
        ]);

        $admin = $this->postJson('/api/auth/login', ['email' => 'a', 'password' => '123', 'role' => 'admin'])
            ->assertOk()->json('token');
        $this->withHeader('Authorization', 'Bearer '.$admin)
            ->getJson('/api/ad-hoc-attendance?page=1&perPage=10')
            ->assertOk()
            ->assertJsonPath('sessions.0.id', $session->id)
            ->assertJsonPath('sessions.0.status', 'open')
            ->assertJsonPath('sessions.0.recordCount', 1);
        $this->getJson('/api/ad-hoc-attendance/'.$session->id)
            ->assertOk()
            ->assertJsonPath('session.id', $session->id)
            ->assertJsonCount(1, 'session.records');
    }

    public function test_admin_can_filter_attendance_sessions_and_receives_filter_options(): void
    {
        $matching = $this->flexible();
        AdHocAttendanceSession::create([
            'id' => 'other-flex-session',
            'user_id' => 'staff-1',
            'subject_name' => 'Networks',
            'subject_code' => 'CS202',
            'faculty' => 'engineering',
            'lecture_type' => 'Section',
            'group' => 'B',
            'week' => '2',
            'term_code' => $this->term,
            'status' => 'closed',
            'started_at' => now()->subHour(),
            'ended_at' => now(),
        ]);

        $admin = $this->postJson('/api/auth/login', ['email' => 'a', 'password' => '123', 'role' => 'admin'])
            ->assertOk()->json('token');

        $this->withHeader('Authorization', 'Bearer '.$admin)
            ->getJson('/api/ad-hoc-attendance?page=1&perPage=10&faculty=computers-ai&subject=CS101&lectureType=Lecture&group=A&week=1&status=open')
            ->assertOk()
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('sessions.0.id', $matching->id)
            ->assertJsonFragment(['value' => 'CS101', 'label' => 'CS101 - Programming'])
            ->assertJsonFragment(['faculties' => ['computers-ai', 'engineering']])
            ->assertJsonFragment(['lectureTypes' => ['Lecture', 'Section']])
            ->assertJsonFragment(['statuses' => ['closed', 'open']]);
    }

    public function test_flexible_session_persists_and_reopens_with_the_all_groups_setting(): void
    {
        $response = $this->postJson('/api/ad-hoc-attendance', [
            'subjectName' => 'Programming',
            'subjectCode' => 'CS101',
            'faculty' => 'computers-ai',
            'lectureType' => 'Lecture',
            'group' => 'A',
            'allowAllGroups' => true,
            'week' => '1',
            'qrWindowSeconds' => 10,
        ])->assertCreated()
            ->assertJsonPath('session.allowAllGroups', true);

        $sessionId = $response->json('session.id');
        $session = AdHocAttendanceSession::findOrFail($sessionId);
        $this->assertTrue($session->allow_all_groups);
        $this->assertDatabaseHas('lecture_sessions', [
            'id' => $session->linked_lecture_session_id,
            'allow_all_groups' => true,
        ]);

        $this->postJson('/api/ad-hoc-attendance/'.$sessionId.'/close')->assertOk();
        $this->postJson('/api/ad-hoc-attendance/'.$sessionId.'/reopen', [
            'qrWindowSeconds' => 10,
            'allowAllGroups' => false,
        ])->assertOk()
            ->assertJsonPath('session.allowAllGroups', false);
        $this->assertDatabaseHas('ad_hoc_attendance_sessions', [
            'id' => $sessionId,
            'allow_all_groups' => false,
        ]);
        $this->assertDatabaseHas('lecture_sessions', [
            'id' => $session->linked_lecture_session_id,
            'allow_all_groups' => false,
        ]);
    }

    public function test_flexible_roster_requires_subject_registration_and_blocks_migrated_sessions(): void
    {
        $this->enable();
        $session = $this->flexible();
        StudentRegistration::where('user_id', 'student-1')->delete();
        $this->getJson($this->url('flexible', $session->id))->assertOk()->assertJsonPath('total', 0);
        $this->postJson($this->url('flexible', $session->id), ['studentIds' => ['student-1']])->assertOk()->assertJsonPath('results.0.status', 'failed');
        $session->update(['status' => 'migrated']);
        $this->getJson($this->url('flexible', $session->id))->assertUnprocessable();
        $this->assertDatabaseCount('ad_hoc_attendance_records', 0);
        $this->assertDatabaseCount('attendance_records', 0);
    }

    public function test_manual_and_bulk_additions_always_require_the_session_faculty_and_registration_scope(): void
    {
        $this->enable();
        $session = $this->flexible();
        StudentRegistration::where('user_id', 'student-1')->delete();

        $this->getJson($this->url('flexible', $session->id))->assertOk()->assertJsonPath('total', 0);
        $this->postJson('/api/ad-hoc-attendance/'.$session->id.'/students', ['studentId' => '29801011234567'])
            ->assertUnprocessable();
        $this->postJson('/api/ad-hoc-attendance/'.$session->id.'/students/bulk', ['studentIdentifiers' => ['29801011234567']])
            ->assertOk()
            ->assertJsonPath('summary.added', 0)
            ->assertJsonPath('summary.notRegistered.0', '29801011234567');

        User::whereKey('staff-1')->update(['require_flexible_student_registration' => false]);
        $this->getJson($this->url('flexible', $session->id))->assertOk()->assertJsonPath('total', 0);
        $this->postJson($this->url('flexible', $session->id), ['studentIds' => ['student-1']])
            ->assertOk()->assertJsonPath('results.0.status', 'failed');
        $this->postJson('/api/ad-hoc-attendance/'.$session->id.'/students', ['studentId' => '29801011234567'])
            ->assertUnprocessable();
        $this->assertDatabaseMissing('ad_hoc_attendance_records', [
            'ad_hoc_attendance_session_id' => $session->id,
            'student_id' => 'student-1',
        ]);
    }

    public function test_closed_flexible_session_accepts_manual_roster_and_bulk_additions(): void
    {
        $this->enable();
        $session = $this->flexible();
        $session->update(['status' => 'closed', 'ended_at' => now()]);

        $this->getJson($this->url('flexible', $session->id))
            ->assertOk()
            ->assertJsonPath('total', 1);
        $this->postJson('/api/ad-hoc-attendance/'.$session->id.'/students', ['studentId' => '29801011234567'])
            ->assertOk();
        $this->assertDatabaseHas('ad_hoc_attendance_records', [
            'ad_hoc_attendance_session_id' => $session->id,
            'student_id' => 'student-1',
        ]);
        $this->postJson('/api/ad-hoc-attendance/'.$session->id.'/students/bulk', ['studentIdentifiers' => ['29801011234567']])
            ->assertOk()
            ->assertJsonPath('summary.alreadyPresent.0', '29801011234567');
        $this->postJson($this->url('flexible', $session->id), ['studentIds' => ['student-1']])
            ->assertOk()
            ->assertJsonPath('results.0.status', 'existing');
    }

    public function test_list_paginates_and_validates_bulk_limits(): void
    {
        $this->enable();
        for ($index = 0; $index < 51; $index++) {
            $student = User::findOrFail('student-1')->replicate();
            $student->id = 'page-student-'.$index;
            $student->email = 'page-'.$index.'@test.example';
            $student->student_id = 'page-'.$index;
            $student->university_id = 'page-'.$index;
            $student->national_id = 'national-'.$index;
            $student->save();
            StudentRegistration::create(['user_id' => $student->id, 'subject_code' => 'CS101', 'group' => 'A', 'type' => 'Lecture', 'term_code' => $this->term]);
        }
        $this->getJson($this->url())->assertOk()->assertJsonPath('total', 52)->assertJsonCount(50, 'data')->assertJsonPath('lastPage', 2);
        $this->getJson($this->url().'?page=2')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson($this->url().'?perPage=500')->assertOk()->assertJsonCount(52, 'data')->assertJsonPath('lastPage', 1);
        $this->postJson($this->url(), ['studentIds' => array_map(fn ($i) => 'id-'.$i, range(1, 501))])->assertUnprocessable();
        $this->postJson($this->url(), ['studentIds' => ['student-1', 'student-1']])->assertUnprocessable();
    }

    public function test_history_view_and_reopening_keep_weeks_and_saved_students_separate(): void
    {
        $this->enable();
        \App\Models\CourseAssignment::where('user_id', 'staff-1')->update(['faculty' => 'computers-ai']);
        $this->postJson($this->url(), ['studentIds' => ['student-1']])->assertOk();
        $next = $this->session->replicate();
        $next->id = 'week-two';
        $next->week = '2';
        $next->save();
        $this->postJson('/api/attendance/manual', array_replace($this->manualPayload(), [
            'lectureSessionId' => $next->id, 'week' => '2',
        ]))->assertCreated();
        $this->getJson('/api/lecture-sessions/'.$this->session->id)->assertOk()
            ->assertJsonPath('session.status', 'ended')->assertJsonPath('session.week', '1')->assertJsonCount(1, 'session.records');
        $this->getJson('/api/lecture-sessions/'.$next->id)->assertOk()
            ->assertJsonPath('session.week', '2')->assertJsonCount(1, 'session.records');
        $this->assertSame('ended', $this->session->fresh()->status);
        $this->postJson('/api/lecture-sessions', [
            'courseCode' => 'CS101', 'lectureType' => 'Lecture', 'group' => 'A', 'week' => '1',
        ])->assertSuccessful()->assertJsonPath('session.id', $this->session->id)
            ->assertJsonPath('session.status', 'active')->assertJsonCount(1, 'session.records');
        $this->assertDatabaseCount('lecture_sessions', 2);
        $this->assertDatabaseCount('attendance_records', 2);
    }

    public function test_flexible_excel_manual_and_roster_share_records_and_deletion_updates_official_attendance(): void
    {
        $this->enable();
        $session = $this->flexible();
        $base = '/api/ad-hoc-attendance/'.$session->id;
        $this->postJson($base.'/students/bulk', ['studentIdentifiers' => ['student-1', 'missing']])
            ->assertOk()->assertJsonPath('summary.added', 1)->assertJsonCount(1, 'summary.notFound');
        $this->getJson($this->url('flexible', $session->id))->assertOk()->assertJsonPath('data.0.present', true);
        $this->postJson($this->url('flexible', $session->id), ['studentIds' => ['student-1']])
            ->assertOk()->assertJsonPath('results.0.status', 'existing');
        $this->postJson($base.'/students', ['studentId' => '29801011234567'])->assertOk();
        $this->assertDatabaseCount('attendance_records', 1);
        $this->assertDatabaseCount('ad_hoc_attendance_records', 1);
        $saved = $this->getJson($base)->assertOk()->assertJsonPath('session.status', 'open')->json('session.records.0.id');
        $this->postJson($base.'/close')->assertOk()->assertJsonPath('session.status', 'closed');
        $this->postJson($base.'/reopen', ['qrWindowSeconds' => 10])->assertOk()
            ->assertJsonPath('session.id', $session->id)->assertJsonPath('session.status', 'open')->assertJsonCount(1, 'session.records');
        $this->deleteJson($base.'/records/'.$saved)->assertOk();
        $this->assertDatabaseCount('attendance_records', 0);
        $this->assertDatabaseCount('ad_hoc_attendance_records', 0);
    }

    public function test_student_qr_scans_and_roster_selection_do_not_duplicate_each_other(): void
    {
        $this->enable();
        $this->session->update(['status' => 'active', 'ended_at' => null]);
        $this->postJson($this->url(), ['studentIds' => ['student-1']])->assertOk();
        $qr = $this->getJson('/api/lecture-sessions/'.$this->session->id.'/qr-token?window=10')->assertOk()->json('qrPayload');
        $studentToken = $this->postJson('/api/auth/login', [
            'email' => '20201001', 'password' => '123', 'role' => 'student', 'deviceIdentifier' => 'roster-scan-device',
        ])->assertOk()->json('token');
        $this->withHeader('Authorization', 'Bearer '.$studentToken)
            ->postJson('/api/attendance/scan', ['qrPayload' => $qr])->assertOk()
            ->assertJsonPath('confirmed', true)->assertJsonPath('alreadyRecorded', true);
        $this->assertDatabaseCount('attendance_records', 1);

        $this->withHeader('Authorization', 'Bearer '.$this->token);
        $flex = $this->flexible();
        $flex->update(['week' => '2']);
        $qr = $this->postJson('/api/ad-hoc-attendance/'.$flex->id.'/reopen', ['qrWindowSeconds' => 10])
            ->assertOk()->json('qrPayload');
        $this->withHeader('Authorization', 'Bearer '.$studentToken)
            ->postJson('/api/attendance/scan', ['qrPayload' => $qr])->assertOk()->assertJsonPath('confirmed', true);
        $this->withHeader('Authorization', 'Bearer '.$this->token)
            ->getJson($this->url('flexible', $flex->id))->assertOk()->assertJsonPath('data.0.present', true);
        $this->postJson($this->url('flexible', $flex->id), ['studentIds' => ['student-1']])->assertOk()
            ->assertJsonPath('results.0.status', 'existing');
        $this->assertDatabaseCount('attendance_records', 2);
        $this->assertDatabaseCount('ad_hoc_attendance_records', 1);
    }
}
