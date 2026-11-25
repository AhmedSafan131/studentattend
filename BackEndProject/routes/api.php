<?php

use App\Http\Controllers\Api\Admin\AcademicTermController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Admin\CatalogSubjectController;
use App\Http\Controllers\Api\Admin\StudentLoginOptionsController;
use App\Http\Controllers\Api\AdHocAttendanceController;
use App\Http\Controllers\Api\AdministrativeSubjectAbsenceController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AttendanceRosterController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\LectureSessionController;
use App\Http\Controllers\Api\StudentController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('credential-context', [AuthController::class, 'credentialContext'])->middleware('throttle:10,1');
    Route::get('session-context', [AuthController::class, 'sessionContext']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('refresh', [AuthController::class, 'refresh']);
    Route::post('logout', [AuthController::class, 'logout']);
    Route::post('upgrade-student-session', [AuthController::class, 'upgradeStudentSession'])->middleware('auth.token');
    Route::get('me', [AuthController::class, 'me'])->middleware(['auth.token', 'term.view']);
    Route::post('staff/access-code', [AuthController::class, 'createStaffAccessCode'])->middleware('auth.token');
    Route::get('staff/access-code', [AuthController::class, 'staffAccessCodeStatus'])->middleware('auth.token');
    Route::delete('staff/access-code', [AuthController::class, 'revokeStaffAccessCode'])->middleware('auth.token');
});

Route::get('student-browser-policy', [AuthController::class, 'browserPolicy']);

Route::get('student-login-options', [StudentLoginOptionsController::class, 'show']);
Route::put('admin/settings/student-login-options', [StudentLoginOptionsController::class, 'update'])
    ->middleware('auth.token');

Route::middleware(['auth.token', 'term.view', 'term.active-for-writes'])->prefix('admin')->group(function () {
    Route::get('users', [UserController::class, 'index']);
    Route::post('users', [UserController::class, 'store']);
    Route::post('users/import', [UserController::class, 'import']);
    Route::put('users/{id}', [UserController::class, 'update']);
    Route::delete('users/{id}', [UserController::class, 'destroy']);
    Route::post('catalog/subjects', [CatalogSubjectController::class, 'store']);
    Route::post('catalog/subjects/import', [CatalogSubjectController::class, 'import']);
    Route::put('catalog/subjects/{catalogSubject}', [CatalogSubjectController::class, 'update']);
    Route::delete('catalog/subjects/{catalogSubject}', [CatalogSubjectController::class, 'destroy']);

    Route::get('terms', [AcademicTermController::class, 'index']);
    Route::post('terms', [AcademicTermController::class, 'store']);
    Route::put('terms/{term}', [AcademicTermController::class, 'update']);
    Route::post('terms/{term}/activate', [AcademicTermController::class, 'setActive']);
    Route::delete('terms/{term}', [AcademicTermController::class, 'destroy']);

    Route::post('staff/{staffId}/courses', [UserController::class, 'addCourse']);
    Route::delete('staff/{staffId}/courses/{courseUid}', [UserController::class, 'deleteCourse']);

    Route::post('doctors/{staffId}/courses', [UserController::class, 'addCourse']);
    Route::delete('doctors/{staffId}/courses/{courseUid}', [UserController::class, 'deleteCourse']);
});

Route::middleware(['auth.token', 'term.view', 'term.active-for-writes'])->group(function () {
    Route::get('terms', [AcademicTermController::class, 'index']);
    Route::get('terms/active', [AcademicTermController::class, 'active']);

    Route::get('catalog/faculties', [CatalogController::class, 'faculties']);
    Route::get('catalog/subjects', [CatalogController::class, 'subjects']);

    Route::get('students', [StudentController::class, 'index']);
    Route::post('students', [StudentController::class, 'store']);
    Route::post('students/import', [StudentController::class, 'import']);
    Route::get('students/locked', [StudentController::class, 'locked']);
    Route::post('students/locked/activate-all', [StudentController::class, 'activateAllLocked']);
    Route::post('students/locked/{id}/activate', [StudentController::class, 'activateLocked']);
    Route::put('students/{id}', [StudentController::class, 'update']);
    Route::delete('students/{id}', [StudentController::class, 'destroy']);

    Route::get('lecture-sessions', [LectureSessionController::class, 'index']);
    Route::post('lecture-sessions', [LectureSessionController::class, 'store']);
    Route::post('lecture-sessions/close-all', [LectureSessionController::class, 'closeAll']);
    Route::get('lecture-sessions/{lectureSession}', [LectureSessionController::class, 'show']);
    Route::post('lecture-sessions/{lectureSession}/end', [LectureSessionController::class, 'end']);
    Route::delete('lecture-sessions/{lectureSession}', [LectureSessionController::class, 'destroy']);
    Route::get('lecture-sessions/{lectureSession}/qr-token', [LectureSessionController::class, 'qrToken']);

    Route::post('attendance/scan', [AttendanceController::class, 'scan']);
    Route::post('attendance/scan-status', [AttendanceController::class, 'scanStatus']);
    Route::get('attendance/server-time', [AttendanceController::class, 'serverTime']);
    Route::get('attendance-roster/options', [AttendanceRosterController::class, 'options']);
    Route::put('admin/settings/attendance-roster', [AttendanceRosterController::class, 'updateOptions']);
    Route::get('attendance-roster/{mode}/{id}', [AttendanceRosterController::class, 'index'])->where('mode', 'dashboard|flexible');
    Route::post('attendance-roster/{mode}/{id}', [AttendanceRosterController::class, 'store'])->where('mode', 'dashboard|flexible');
    Route::post('attendance/manual', [AttendanceController::class, 'storeManual']);
    Route::get('attendance/admin-student-view', [AttendanceController::class, 'adminStudentView']);
    Route::get('attendance/report-options', [AttendanceController::class, 'reportOptions']);
    Route::get('attendance/report', [AttendanceController::class, 'report']);
    Route::get('attendance', [AttendanceController::class, 'index']);
    Route::delete('attendance/student', [AttendanceController::class, 'destroyStudent']);
    Route::delete('attendance/{attendanceRecord}', [AttendanceController::class, 'destroy']);
    Route::get('attendance/my', [AttendanceController::class, 'mine']);
    Route::get('admin/subject-absences', [AdministrativeSubjectAbsenceController::class, 'index']);
    Route::post('admin/subject-absences', [AdministrativeSubjectAbsenceController::class, 'store']);
    Route::delete('admin/subject-absences/{absence}', [AdministrativeSubjectAbsenceController::class, 'destroy']);

    Route::get('ad-hoc-attendance', [AdHocAttendanceController::class, 'index']);
    Route::get('ad-hoc-attendance/migration-preview', [AdHocAttendanceController::class, 'migrationPreview']);
    Route::get('ad-hoc-attendance/{session}', [AdHocAttendanceController::class, 'show']);
    Route::post('ad-hoc-attendance', [AdHocAttendanceController::class, 'store']);
    Route::get('ad-hoc-attendance/{session}/qr-token', [AdHocAttendanceController::class, 'qrToken']);
    Route::post('ad-hoc-attendance/{session}/students', [AdHocAttendanceController::class, 'addStudent']);
    Route::post('ad-hoc-attendance/{session}/students/bulk', [AdHocAttendanceController::class, 'addStudentsBulk']);
    Route::delete('ad-hoc-attendance/{session}', [AdHocAttendanceController::class, 'destroy']);
    Route::delete('ad-hoc-attendance/{session}/records/{record}', [AdHocAttendanceController::class, 'destroyRecord']);
    Route::post('ad-hoc-attendance/close-all', [AdHocAttendanceController::class, 'closeAll']);
    Route::post('ad-hoc-attendance/migrate-all', [AdHocAttendanceController::class, 'migrateAll']);
    Route::post('ad-hoc-attendance/{session}/close', [AdHocAttendanceController::class, 'close']);
    Route::post('ad-hoc-attendance/{session}/reopen', [AdHocAttendanceController::class, 'reopen']);
    Route::post('ad-hoc-attendance/{session}/migrate', [AdHocAttendanceController::class, 'migrate']);
});
