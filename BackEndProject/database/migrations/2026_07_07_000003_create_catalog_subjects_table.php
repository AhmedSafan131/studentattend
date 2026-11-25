<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_subjects', function (Blueprint $table) {
            $table->id();
            $table->string('faculty_id', 100)->index();
            $table->string('faculty_name', 255);
            $table->string('subject_code', 255);
            $table->string('subject_name', 255);
            $table->timestamps();

            $table->unique(['faculty_id', 'subject_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_subjects');
    }
};
