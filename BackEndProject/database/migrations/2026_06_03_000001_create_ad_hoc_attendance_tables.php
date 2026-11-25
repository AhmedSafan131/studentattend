<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ad_hoc_attendance_sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id')->index();
            $table->string('subject_name');
            $table->string('subject_code')->nullable()->index();
            $table->string('faculty')->index();
            $table->string('group')->nullable()->index();
            $table->string('status')->default('open')->index();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('migrated_at')->nullable();
            $table->string('migrated_to_course_code')->nullable()->index();
            $table->string('migrated_to_lecture_type')->nullable()->index();
            $table->string('migrated_to_group')->nullable()->index();
            $table->string('migrated_to_week')->nullable()->index();
            $table->string('migrated_to_faculty')->nullable()->index();
            $table->string('migrated_by')->nullable()->index();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('migrated_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('ad_hoc_attendance_records', function (Blueprint $table) {
            $table->id();
            $table->string('ad_hoc_attendance_session_id')->index();
            $table->string('student_id')->index();
            $table->timestamp('scanned_at')->nullable();
            $table->timestamps();

            $table->unique(['ad_hoc_attendance_session_id', 'student_id'], 'ad_hoc_session_student_unique');
            $table->foreign('ad_hoc_attendance_session_id', 'ad_hoc_records_session_fk')
                ->references('id')
                ->on('ad_hoc_attendance_sessions')
                ->cascadeOnDelete();
            $table->foreign('student_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ad_hoc_attendance_records');
        Schema::dropIfExists('ad_hoc_attendance_sessions');
    }
};
