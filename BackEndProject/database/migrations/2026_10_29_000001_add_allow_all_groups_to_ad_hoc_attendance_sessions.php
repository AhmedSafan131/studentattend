<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
            $table->boolean('allow_all_groups')->default(false)->after('group');
        });
    }

    public function down(): void
    {
        Schema::table('ad_hoc_attendance_sessions', function (Blueprint $table) {
            $table->dropColumn('allow_all_groups');
        });
    }
};
