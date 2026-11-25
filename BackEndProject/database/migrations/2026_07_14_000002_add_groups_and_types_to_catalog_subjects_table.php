<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_subjects', function (Blueprint $table) {
            $table->unsignedTinyInteger('group_count')->default(1);
            $table->json('types')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('catalog_subjects', function (Blueprint $table) {
            $table->dropColumn(['group_count', 'types']);
        });
    }
};
