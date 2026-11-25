<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasIndex('ad_hoc_attendance_sessions', 'adhoc_status_started_at_index')) {
            Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
                $table->index(['status', 'started_at'], 'adhoc_status_started_at_index');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('ad_hoc_attendance_sessions', 'adhoc_status_started_at_index')) {
            Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
                $table->dropIndex('adhoc_status_started_at_index');
            });
        }
    }
};
