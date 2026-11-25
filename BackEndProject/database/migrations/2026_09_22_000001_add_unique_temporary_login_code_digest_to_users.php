<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The column can already exist on databases where this migration was
        // applied manually before its entry was recorded. Do not overwrite
        // existing access codes or tokens in that case.
        if (Schema::hasColumn('users', 'temporary_login_code_digest')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('temporary_login_code_digest', 64)
                ->nullable()
                ->unique()
                ->after('temporary_login_code_hash');
        });

        // Legacy codes cannot be looked up by their bcrypt-only value. Revoke
        // them during deployment so every displayed active code follows the new
        // code-in-both-fields login contract.
        DB::table('users')
            ->whereNotNull('temporary_login_code_hash')
            ->update([
                'temporary_login_code_hash' => null,
                'temporary_login_code_digest' => null,
                'temporary_login_code_expires_at' => null,
            ]);

        DB::table('api_tokens')
            ->where('name', 'frontend-temporary-staff-access')
            ->delete();
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['temporary_login_code_digest']);
            $table->dropColumn('temporary_login_code_digest');
        });
    }
};
