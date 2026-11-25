<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('administrative_subject_absences', function (Blueprint $table) {
            $table->uuid('lecture_session_id')->nullable()->after('id');
            $table->string('source', 32)->default('administrative')->after('created_by');
            $table->foreign('lecture_session_id')
                ->references('id')
                ->on('lecture_sessions')
                ->cascadeOnDelete();
            $table->index('lecture_session_id', 'subject_absences_lecture_session_index');
        });
    }

    public function down(): void
    {
        Schema::table('administrative_subject_absences', function (Blueprint $table) {
            $table->dropForeign(['lecture_session_id']);
            $table->dropIndex('subject_absences_lecture_session_index');
            $table->dropColumn(['lecture_session_id', 'source']);
        });
    }
};
