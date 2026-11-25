<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $defaultTerm = 'SUMMER-2025-2026';

        $tables = [
            'student_registrations',
            'course_assignments',
            'lecture_sessions',
            'ad_hoc_attendance_sessions',
            'attendance_records',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && ! Schema::hasColumn($table, 'term_code')) {
                Schema::table($table, function (Blueprint $tableSchema) {
                    $tableSchema->string('term_code')->nullable()->index();
                });

                DB::table($table)->whereNull('term_code')->update(['term_code' => $defaultTerm]);
            }
        }
    }

    public function down(): void
    {
        $tables = [
            'student_registrations',
            'course_assignments',
            'lecture_sessions',
            'ad_hoc_attendance_sessions',
            'attendance_records',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'term_code')) {
                Schema::table($table, function (Blueprint $tableSchema) {
                    $tableSchema->dropColumn('term_code');
                });
            }
        }
    }
};
