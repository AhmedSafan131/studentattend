<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_assignments', function (Blueprint $table) {
            $table->string('uid')->primary();
            $table->string('user_id')->index();
            $table->string('course_id');
            $table->string('name');
            $table->string('faculty')->nullable();
            $table->string('college')->nullable();
            $table->string('type')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_assignments');
    }
};
