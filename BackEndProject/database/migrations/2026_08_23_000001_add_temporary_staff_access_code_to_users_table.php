<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('temporary_login_code_hash')->nullable()->after('password');
            $table->timestamp('temporary_login_code_expires_at')->nullable()->after('temporary_login_code_hash');
        });

        // Existing staff sessions remain signed in after this policy change.
        DB::table('api_tokens')
            ->whereIn('user_id', DB::table('users')->whereIn('role', ['staff', 'doctor'])->select('id'))
            ->update(['expires_at' => null]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['temporary_login_code_hash', 'temporary_login_code_expires_at']);
        });
    }
};
