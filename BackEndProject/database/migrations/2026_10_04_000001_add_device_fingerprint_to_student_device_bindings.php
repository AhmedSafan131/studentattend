<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_device_bindings', function (Blueprint $table) {
            $table->json('device_fingerprint')->nullable()->after('browser');
        });
    }

    public function down(): void
    {
        Schema::table('student_device_bindings', function (Blueprint $table) {
            $table->dropColumn('device_fingerprint');
        });
    }
};
