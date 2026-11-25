<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('restrict_flexible_attendance_to_assignments')
                ->default(false)
                ->after('allowed_colleges');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => (
            $table->dropColumn('restrict_flexible_attendance_to_assignments')
        ));
    }
};
