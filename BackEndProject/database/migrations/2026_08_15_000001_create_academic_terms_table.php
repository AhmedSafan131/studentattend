<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_terms', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('academic_year')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->integer('weeks_count')->default(14);
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        // Insert default initial active academic term (Summer Term 2025/2026)
        DB::table('academic_terms')->insert([
            'code' => 'SUMMER-2025-2026',
            'name' => 'الترم الصيفي 2025/2026',
            'academic_year' => '2025/2026',
            'start_date' => '2026-06-01',
            'end_date' => '2026-08-31',
            'weeks_count' => 12,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_terms');
    }
};
