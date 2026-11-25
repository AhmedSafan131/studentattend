<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('lecture_sessions') && ! Schema::hasIndex('lecture_sessions', 'lecture_sessions_term_user_started_index')) {
            Schema::table('lecture_sessions', fn (Blueprint $table) => $table->index(
                ['term_code', 'user_id', 'started_at'],
                'lecture_sessions_term_user_started_index'
            ));
        }
        if (Schema::hasTable('ad_hoc_attendance_sessions') && ! Schema::hasIndex('ad_hoc_attendance_sessions', 'adhoc_term_user_created_index')) {
            Schema::table('ad_hoc_attendance_sessions', fn (Blueprint $table) => $table->index(
                ['term_code', 'user_id', 'created_at'],
                'adhoc_term_user_created_index'
            ));
        }
        if (Schema::hasTable('administrative_subject_absences') && ! Schema::hasIndex('administrative_subject_absences', 'admin_absences_term_created_index')) {
            Schema::table('administrative_subject_absences', fn (Blueprint $table) => $table->index(
                ['term_code', 'created_at'],
                'admin_absences_term_created_index'
            ));
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('administrative_subject_absences') && Schema::hasIndex('administrative_subject_absences', 'admin_absences_term_created_index')) {
            Schema::table('administrative_subject_absences', fn (Blueprint $table) => $table->dropIndex('admin_absences_term_created_index'));
        }
        if (Schema::hasTable('ad_hoc_attendance_sessions') && Schema::hasIndex('ad_hoc_attendance_sessions', 'adhoc_term_user_created_index')) {
            Schema::table('ad_hoc_attendance_sessions', fn (Blueprint $table) => $table->dropIndex('adhoc_term_user_created_index'));
        }
        if (Schema::hasTable('lecture_sessions') && Schema::hasIndex('lecture_sessions', 'lecture_sessions_term_user_started_index')) {
            Schema::table('lecture_sessions', fn (Blueprint $table) => $table->dropIndex('lecture_sessions_term_user_started_index'));
        }
    }
};
