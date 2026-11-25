<?php

use App\Models\AcademicTerm;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('catalog_subjects') && ! Schema::hasColumn('catalog_subjects', 'term_code')) {
            Schema::table('catalog_subjects', function (Blueprint $table) {
                $table->string('term_code', 120)->nullable()->index();
            });

            $defaultTermCode = AcademicTerm::getActiveTermCode() ?: 'FIRST-2026-2027';

            DB::table('catalog_subjects')
                ->whereNull('term_code')
                ->update(['term_code' => $defaultTermCode]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('catalog_subjects') && Schema::hasColumn('catalog_subjects', 'term_code')) {
            Schema::table('catalog_subjects', function (Blueprint $table) {
                $table->dropColumn('term_code');
            });
        }
    }
};
