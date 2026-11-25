<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('student_device_bindings') && ! Schema::hasColumn('student_device_bindings', 'term_code')) {
            Schema::table('student_device_bindings', function (Blueprint $table) {
                $table->string('term_code')->nullable()->index();
            });

            DB::table('student_device_bindings')
                ->whereNull('term_code')
                ->update(['term_code' => 'SUMMER-2025-2026']);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('student_device_bindings') && Schema::hasColumn('student_device_bindings', 'term_code')) {
            Schema::table('student_device_bindings', function (Blueprint $table) {
                $table->dropColumn('term_code');
            });
        }
    }
};
