<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->string('lecture_session_id')->index();
            $table->string('student_id')->index();
            $table->string('course_code')->index();
            $table->string('lecture_type')->nullable()->index();
            $table->string('group')->nullable()->index();
            $table->string('week')->nullable()->index();
            $table->timestamp('scanned_at')->nullable();
            $table->timestamps();

            $table->unique(['lecture_session_id', 'student_id']);
            $table->foreign('lecture_session_id')->references('id')->on('lecture_sessions')->cascadeOnDelete();
            $table->foreign('student_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
