<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_device_bindings', function (Blueprint $table) {
            $table->dropUnique('student_device_bindings_device_identifier_unique');
            $table->index('device_identifier');
        });
    }

    public function down(): void
    {
        Schema::table('student_device_bindings', function (Blueprint $table) {
            $table->dropIndex(['device_identifier']);
            $table->unique('device_identifier');
        });
    }
};
