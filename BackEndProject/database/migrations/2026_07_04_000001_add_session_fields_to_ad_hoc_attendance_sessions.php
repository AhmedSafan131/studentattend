<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
            $table->string('lecture_type')->nullable()->index()->after('faculty');
            $table->string('week')->nullable()->index()->after('group');
            $table->unsignedSmallInteger('qr_window_seconds')->default(5)->after('week');
        });
    }

    public function down(): void
    {
        Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
            $table->dropColumn(['lecture_type', 'week', 'qr_window_seconds']);
        });
    }
};
