<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\LectureSessionController;
use App\Models\AcademicTerm;
use App\Models\CatalogSubject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class LectureCatalogValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_requires_assigned_type_and_catalog_group(): void
    {
        $term = AcademicTerm::getActiveTermCode();
        $doctor = User::query()->create([
            'id' => 'test-doctor', 'name' => 'Doctor', 'full_name' => 'Doctor',
            'email' => 'doctor@test.local', 'password' => 'password', 'role' => 'staff',
        ]);
        $doctor->courses()->create([
            'uid' => 'test-assignment', 'course_id' => 'CS101', 'name' => 'Programming',
            'faculty' => 'computers-ai', 'type' => 'Section', 'term_code' => $term,
        ]);
        CatalogSubject::query()->create([
            'faculty_id' => 'computers-ai', 'faculty_name' => 'Computers',
            'subject_code' => 'CS101', 'subject_name' => 'Programming', 'term_code' => $term,
            'group_count' => 4, 'group_counts' => ['Lecture' => 3, 'Section' => 4, 'Practical' => 2],
            'types' => ['Lecture', 'Section', 'Practical'],
        ]);
        foreach ([['Lecture', 'A', 403], ['Section', 'E', 422], ['Section', 'D', 201]] as [$type, $group, $status]) {
            $request = Request::create('/api/lecture-sessions', 'POST', [
                'courseCode' => 'CS101', 'lectureType' => $type, 'group' => $group, 'week' => '1',
            ]);
            $request->setUserResolver(fn () => $doctor);
            $response = app(LectureSessionController::class)->store($request);
            $this->assertSame($status, $response->getStatusCode(), $response->getContent());
        }
    }
}
