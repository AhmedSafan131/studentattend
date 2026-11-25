<?php

namespace Database\Seeders;

use App\Models\CourseAssignment;
use App\Models\AcademicTerm;
use App\Models\CatalogSubject;
use App\Models\StudentRegistration;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $termCode = AcademicTerm::getActiveTermCode();

        foreach ([
            ['code' => 'CS101', 'name' => 'Intro to Programming'],
            ['code' => 'CS201', 'name' => 'Data Structures'],
        ] as $subject) {
            CatalogSubject::query()->updateOrCreate(
                [
                    'faculty_id' => 'computers-ai',
                    'subject_code' => $subject['code'],
                    'term_code' => $termCode,
                ],
                [
                    'faculty_name' => 'Faculty of Computers and Artificial Intelligence',
                    'subject_name' => $subject['name'],
                    'group_count' => 6,
                    'group_counts' => ['Lecture' => 6, 'Section' => 6, 'Practical' => 6],
                    'types' => ['Lecture', 'Section', 'Practical'],
                ],
            );
        }

        $admin = User::query()->updateOrCreate(
            ['id' => 'admin-1'],
            [
                'email' => 'a',
                'name' => 'System Administrator',
                'full_name' => 'System Administrator',
                'password' => Hash::make('123'),
                'role' => 'admin',
                'specialty' => 'University Administration',
                'avatar' => 'SA',
                'is_system' => true,
                'permissions' => Permissions::SYSTEM_ADMIN,
                'allowed_colleges' => [],
            ],
        );

        $staff = User::query()->updateOrCreate(
            ['id' => 'staff-1'],
            [
                'email' => 'staff',
                'name' => 'Staff Member',
                'full_name' => 'Staff Member',
                'password' => Hash::make('123'),
                'role' => 'staff',
                'specialty' => 'Computer Science',
                'avatar' => 'SM',
                'is_system' => false,
                'permissions' => Permissions::STAFF,
                'allowed_colleges' => ['Computer Science & Engineering'],
            ],
        );

        CourseAssignment::query()->updateOrCreate(
            ['uid' => 'CS101-LEC'],
            [
                'user_id' => $staff->id,
                'course_id' => 'CS101',
                'name' => 'Intro to Programming',
                'faculty' => 'engineering',
                'college' => 'cs',
                'type' => 'Lecture',
                'term_code' => $termCode,
            ],
        );

        $student = User::query()->updateOrCreate(
            ['id' => 'student-1'],
            [
                'email' => 'student',
                'name' => 'Student Account',
                'full_name' => 'Student Account',
                'password' => Hash::make('123'),
                'role' => 'student',
                'avatar' => 'ST',
                'is_system' => false,
                'permissions' => [],
                'allowed_colleges' => [],
                'student_id' => '20201001',
                'university_id' => '20201001',
                'national_id' => '29801011234567',
                'college' => 'Computer Science & Engineering',
            ],
        );

        StudentRegistration::query()->updateOrCreate(
            [
                'user_id' => $student->id,
                'subject_code' => 'CS101',
                'group' => 'A',
                'type' => 'Lecture',
                'term_code' => $termCode,
            ],
            ['subject_name' => 'Intro to Programming'],
        );
    }
}
