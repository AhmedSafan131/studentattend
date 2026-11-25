<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('lecture_sessions') && ! Schema::hasIndex('lecture_sessions', 'lecture_sessions_term_status_index')) {
            Schema::table('lecture_sessions', function (Blueprint $table) {
                $table->index(['term_code', 'status'], 'lecture_sessions_term_status_index');
            });
        }

        if (Schema::hasTable('ad_hoc_attendance_sessions') && ! Schema::hasIndex('ad_hoc_attendance_sessions', 'adhoc_status_linked_session_index')) {
            Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
                $table->index(['status', 'linked_lecture_session_id'], 'adhoc_status_linked_session_index');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ad_hoc_attendance_sessions') && Schema::hasIndex('ad_hoc_attendance_sessions', 'adhoc_status_linked_session_index')) {
            Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
                $table->dropIndex('adhoc_status_linked_session_index');
            });
        }

        if (Schema::hasTable('lecture_sessions') && Schema::hasIndex('lecture_sessions', 'lecture_sessions_term_status_index')) {
            Schema::table('lecture_sessions', function (Blueprint $table) {
                $table->dropIndex('lecture_sessions_term_status_index');
            });
        }
    }
};
