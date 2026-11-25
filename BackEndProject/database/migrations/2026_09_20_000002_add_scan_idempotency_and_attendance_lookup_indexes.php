<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('attendance_records', 'scan_request_id')) {
            Schema::table('attendance_records', function (Blueprint $table) {
                $table->uuid('scan_request_id')->nullable()->after('student_id');
            });
        }

        if (! Schema::hasIndex('attendance_records', 'attendance_records_scan_request_id_unique')) {
            Schema::table('attendance_records', fn (Blueprint $table) => $table->unique('scan_request_id'));
        }

        if (! Schema::hasIndex('attendance_records', 'attendance_week_lookup_index')) {
            Schema::table('attendance_records', function (Blueprint $table) {
                // The remaining type/week predicates are evaluated over the very
                // small student/course range without exceeding MySQL's key limit.
                $table->index(
                    ['student_id', 'term_code', 'course_code'],
                    'attendance_week_lookup_index'
                );
            });
        }

        if (! Schema::hasColumn('ad_hoc_attendance_records', 'scan_request_id')) {
            Schema::table('ad_hoc_attendance_records', function (Blueprint $table) {
                $table->uuid('scan_request_id')->nullable()->after('student_id');
            });
        }

        if (! Schema::hasIndex('ad_hoc_attendance_records', 'ad_hoc_attendance_records_scan_request_id_unique')) {
            Schema::table('ad_hoc_attendance_records', fn (Blueprint $table) => $table->unique('scan_request_id'));
        }
    }

    public function down(): void
    {
        Schema::table('ad_hoc_attendance_records', function (Blueprint $table) {
            $table->dropUnique(['scan_request_id']);
            $table->dropColumn('scan_request_id');
        });

        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropIndex('attendance_week_lookup_index');
            $table->dropUnique(['scan_request_id']);
            $table->dropColumn('scan_request_id');
        });
    }
};
