<?php

namespace Tests\Feature;

use App\Models\AcademicTerm;
use App\Models\CourseAssignment;
use App\Models\StudentRegistration;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StudentBulkImportTest extends TestCase
{
    public function test_bulk_import_rejects_an_email_claimed_by_another_student_before_writing_registrations(): void
    {
        $this->artisan('migrate:fresh --seed');

        $token = $this->postJson('/api/auth/login', [
            'email' => 'a',
            'password' => '123',
            'role' => 'admin',
        ])->assertOk()->json('token');
        $existingStudent = User::query()->findOrFail('student-1');
        $existingStudent->update(['email' => 'shared-student@example.test']);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/students/import', [
                'students' => [
                    [
                        'name' => $existingStudent->full_name,
                        'studentId' => $existingStudent->student_id,
                        'nationalId' => $existingStudent->national_id,
                        'email' => 'shared-student@example.test',
                        'college' => $existingStudent->college,
                        'registrations' => [],
                    ],
                    [
                        'name' => 'New Student With Duplicate Email',
                        'studentId' => '20209997',
                        'nationalId' => '29901011239997',
                        'email' => 'shared-student@example.test',
                        'college' => 'Computer Science & Engineering',
                        'registrations' => [],
                    ],
                ],
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['students.1.email']);
        $this->assertDatabaseMissing('users', ['student_id' => '20209997']);
        $this->assertDatabaseHas('users', [
            'id' => $existingStudent->id,
            'email' => 'shared-student@example.test',
            'student_id' => $existingStudent->student_id,
        ]);
    }

    public function test_bulk_import_chunked_validation_keeps_original_student_index(): void
    {
        $this->artisan('migrate:fresh --seed');

        $token = $this->postJson('/api/auth/login', [
            'email' => 'a',
            'password' => '123',
            'role' => 'admin',
        ])->assertOk()->json('token');

        $students = array_map(fn (int $index) => [
            'name' => "Student {$index}",
            'studentId' => "bulk-{$index}",
            'nationalId' => "national-{$index}",
            'college' => 'Computer Science & Engineering',
            'registrations' => [],
        ], range(0, 100));
        unset($students[0]['name'], $students[100]['name']);

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/students/import', ['students' => $students])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['students.0.name', 'students.100.name']);
    }

    public function test_bulk_import_updates_current_term_in_batches_without_touching_existing_password_or_other_students(): void
    {
        $this->artisan('migrate:fresh --seed');

        $token = $this->postJson('/api/auth/login', [
            'email' => 'a',
            'password' => '123',
            'role' => 'admin',
        ])->assertOk()->json('token');
        $termCode = AcademicTerm::getActiveTermCode();
        $existingStudent = User::query()->findOrFail('student-1');
        $existingPasswordHash = $existingStudent->password;

        StudentRegistration::query()->create([
            'user_id' => $existingStudent->id,
            'subject_code' => 'OLD101',
            'subject_name' => 'Historical Subject',
            'group' => 'A',
            'type' => 'Lecture',
            'term_code' => 'HISTORICAL-TERM',
        ]);
        CourseAssignment::query()->create([
            'uid' => 'unexpected-student-course',
            'user_id' => $existingStudent->id,
            'course_id' => 'CS101',
            'name' => 'Unexpected Student Course',
            'faculty' => 'computers-ai',
            'college' => 'computers-ai',
            'type' => 'Lecture',
            'term_code' => $termCode,
        ]);
        $absentStudent = User::query()->create([
            'id' => 'student-absent-from-import',
            'email' => 'absent-student@example.test',
            'name' => 'Absent Student',
            'full_name' => 'Absent Student',
            'password' => 'AbsentPassword123',
            'role' => 'student',
            'student_id' => '20209998',
            'university_id' => '20209998',
            'national_id' => '29901011239998',
            'college' => 'Computer Science & Engineering',
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/students/import', [
                'students' => [
                    [
                        'name' => 'Updated Student Account',
                        'studentId' => '20201001',
                        'universityId' => '20201001',
                        'nationalId' => '29801011234567',
                        'email' => 'student',
                        'password' => 'must-not-replace-existing-password',
                        'college' => 'Computer Science & Engineering',
                        'registrations' => [[
                            'subjectCode' => 'CS201',
                            'subjectName' => 'Ignored Sheet Name',
                            'group' => 'B',
                            'type' => 'Section',
                        ]],
                    ],
                    [
                        'name' => 'New Bulk Student',
                        'studentId' => '20209999',
                        'universityId' => '20209999',
                        'nationalId' => '29901011239999',
                        'email' => 'new-bulk-student@example.test',
                        'password' => 'NewBulkStudentPassword123',
                        'college' => 'Computer Science & Engineering',
                        'registrations' => [[
                            'subjectCode' => 'CS101',
                            'group' => 'A',
                            'type' => 'Lecture',
                        ]],
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('summary.created', 1)
            ->assertJsonPath('summary.updated', 1);

        $existingStudent->refresh();
        $this->assertSame($existingPasswordHash, $existingStudent->password);
        $this->assertTrue(Hash::check('123', $existingStudent->password));
        $this->assertDatabaseMissing('student_registrations', [
            'user_id' => $existingStudent->id,
            'subject_code' => 'CS101',
            'term_code' => $termCode,
        ]);
        $this->assertDatabaseHas('student_registrations', [
            'user_id' => $existingStudent->id,
            'subject_code' => 'CS201',
            'subject_name' => 'Data Structures',
            'group' => 'B',
            'type' => 'Section',
            'term_code' => $termCode,
        ]);
        $this->assertDatabaseHas('student_registrations', [
            'user_id' => $existingStudent->id,
            'subject_code' => 'OLD101',
            'term_code' => 'HISTORICAL-TERM',
        ]);
        $this->assertDatabaseMissing('course_assignments', ['uid' => 'unexpected-student-course']);
        $this->assertDatabaseHas('users', ['id' => $absentStudent->id]);

        $newStudent = User::query()->where('student_id', '20209999')->firstOrFail();
        $this->assertTrue(Hash::check('NewBulkStudentPassword123', $newStudent->password));
    }
}
