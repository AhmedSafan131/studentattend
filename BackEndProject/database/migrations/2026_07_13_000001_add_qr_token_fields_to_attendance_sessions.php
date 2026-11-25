<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lecture_sessions', function (Blueprint $table) {
            $table->string('qr_token', 32)->nullable()->unique()->after('status');
            $table->timestamp('qr_token_expires_at')->nullable()->after('qr_token');
        });

        Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
            $table->string('qr_token', 32)->nullable()->unique()->after('qr_window_seconds');
            $table->timestamp('qr_token_expires_at')->nullable()->after('qr_token');
        });
    }

    public function down(): void
    {
        Schema::table('lecture_sessions', function (Blueprint $table) {
            $table->dropUnique(['qr_token']);
            $table->dropColumn(['qr_token', 'qr_token_expires_at']);
        });

        Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
            $table->dropUnique(['qr_token']);
            $table->dropColumn(['qr_token', 'qr_token_expires_at']);
        });
    }
};
