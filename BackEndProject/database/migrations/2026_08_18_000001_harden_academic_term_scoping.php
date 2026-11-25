<?php

use App\Models\AcademicTerm;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // All pre-term data belongs to the current Summer 2025/2026 term.
        // Ensure it is visible and active before assigning legacy records to it.
        $summerTerm = AcademicTerm::query()->firstOrCreate(
            ['code' => 'SUMMER-2025-2026'],
            [
                'name' => 'Summer 2025/2026',
                'academic_year' => '2025/2026',
                'start_date' => '2026-06-01',
                'end_date' => '2026-08-31',
                'weeks_count' => 12,
                'is_active' => true,
            ],
        );

        AcademicTerm::query()->whereKeyNot($summerTerm->id)->update(['is_active' => false]);
        $summerTerm->update(['is_active' => true]);

        $activeTermCode = AcademicTerm::getActiveTermCode();

        foreach ([
            'student_registrations',
            'course_assignments',
            'lecture_sessions',
            'ad_hoc_attendance_sessions',
            'attendance_records',
            'catalog_subjects',
        ] as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'term_code')) {
                DB::table($table)->whereNull('term_code')->update(['term_code' => $activeTermCode]);
            }
        }

        if (Schema::hasTable('catalog_subjects')) {
            Schema::table('catalog_subjects', function (Blueprint $table) {
                $table->dropUnique('catalog_subjects_faculty_id_subject_code_unique');
            });

            Schema::table('catalog_subjects', function (Blueprint $table) {
                $table->unique(
                    ['faculty_id', 'subject_code', 'term_code'],
                    'catalog_subjects_faculty_subject_term_unique',
                );
            });
        }

        if (Schema::hasTable('student_registrations') && Schema::hasColumn('student_registrations', 'term_code')) {
            Schema::table('student_registrations', function (Blueprint $table) {
                $table->index(['user_id', 'term_code'], 'student_registrations_user_term_index');
            });
        }

        if (Schema::hasTable('course_assignments') && Schema::hasColumn('course_assignments', 'term_code')) {
            Schema::table('course_assignments', function (Blueprint $table) {
                $table->index(['user_id', 'term_code'], 'course_assignments_user_term_index');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('student_registrations')) {
            Schema::table('student_registrations', function (Blueprint $table) {
                $table->dropIndex('student_registrations_user_term_index');
            });
        }

        if (Schema::hasTable('course_assignments')) {
            Schema::table('course_assignments', function (Blueprint $table) {
                $table->dropIndex('course_assignments_user_term_index');
            });
        }

        if (Schema::hasTable('catalog_subjects')) {
            Schema::table('catalog_subjects', function (Blueprint $table) {
                $table->dropUnique('catalog_subjects_faculty_subject_term_unique');
                $table->unique(['faculty_id', 'subject_code']);
            });
        }
    }
};
