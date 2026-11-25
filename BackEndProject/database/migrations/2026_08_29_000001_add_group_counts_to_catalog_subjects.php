<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_subjects', function (Blueprint $table) {
            $table->json('group_counts')->nullable()->after('group_count');
        });

        DB::table('catalog_subjects')->orderBy('id')->each(function ($subject): void {
            $types = json_decode((string) $subject->types, true) ?: ['Lecture'];
            $legacyCount = max(1, min(26, (int) ($subject->group_count ?: 1)));
            $counts = ['Lecture' => 0, 'Section' => 0, 'Practical' => 0];

            foreach ($types as $type) {
                if (array_key_exists($type, $counts)) {
                    $counts[$type] = $legacyCount;
                }
            }

            DB::table('catalog_subjects')->where('id', $subject->id)->update([
                'group_counts' => json_encode($counts),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('catalog_subjects', function (Blueprint $table) {
            $table->dropColumn('group_counts');
        });
    }
};
