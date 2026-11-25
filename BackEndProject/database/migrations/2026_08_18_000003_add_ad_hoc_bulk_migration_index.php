<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
            $table->index(['term_code', 'status', 'id'], 'ad_hoc_sessions_term_status_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
            $table->dropIndex('ad_hoc_sessions_term_status_id_index');
        });
    }
};
