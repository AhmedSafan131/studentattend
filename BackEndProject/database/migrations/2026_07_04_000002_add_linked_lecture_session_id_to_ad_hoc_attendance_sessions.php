<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
            $table->string('linked_lecture_session_id')->nullable()->index()->after('qr_window_seconds');
            $table->foreign('linked_lecture_session_id')
                ->references('id')
                ->on('lecture_sessions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
            $table->dropForeign(['linked_lecture_session_id']);
            $table->dropColumn('linked_lecture_session_id');
        });
    }
};
