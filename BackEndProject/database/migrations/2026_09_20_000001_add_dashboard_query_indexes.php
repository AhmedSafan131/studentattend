<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->index(['role', 'full_name'], 'users_role_full_name_index');
            $table->index(['role', 'college', 'full_name'], 'users_role_college_name_index');
        });

        Schema::table('student_device_bindings', function (Blueprint $table) {
            $table->index(['term_code', 'updated_at'], 'device_bindings_term_updated_index');
        });

        Schema::table('student_registrations', function (Blueprint $table) {
            $table->index(['term_code', 'subject_code', 'user_id'], 'registrations_term_subject_user_index');
        });

        Schema::table('course_assignments', function (Blueprint $table) {
            $table->index(['term_code', 'user_id'], 'course_assignments_term_user_index');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_role_full_name_index');
            $table->dropIndex('users_role_college_name_index');
        });
        Schema::table('student_device_bindings', fn (Blueprint $table) => $table->dropIndex('device_bindings_term_updated_index'));
        Schema::table('student_registrations', fn (Blueprint $table) => $table->dropIndex('registrations_term_subject_user_index'));
        Schema::table('course_assignments', fn (Blueprint $table) => $table->dropIndex('course_assignments_term_user_index'));
    }
};
