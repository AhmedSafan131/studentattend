<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('administrative_subject_absences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('student_id');
            $table->string('created_by');
            $table->string('faculty_id', 120);
            $table->string('subject_code', 120);
            $table->string('subject_name');
            $table->string('lecture_type', 40);
            $table->string('group', 50);
            $table->string('week', 50);
            $table->string('term_code', 120);
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(
                ['student_id', 'subject_code', 'lecture_type', 'group', 'week', 'term_code'],
                'admin_subject_absence_unique'
            );
            $table->index(['faculty_id', 'subject_code', 'term_code'], 'admin_subject_absence_scope');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('administrative_subject_absences');
    }
};
