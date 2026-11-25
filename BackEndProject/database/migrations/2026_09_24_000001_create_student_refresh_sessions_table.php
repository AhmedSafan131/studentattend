<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_refresh_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('user_id')->index();
            $table->unsignedBigInteger('student_device_binding_id')->index();
            $table->uuid('family_id')->index();
            $table->string('token_hash', 64)->unique();
            $table->unsignedBigInteger('replaced_by_id')->nullable()->index();
            $table->timestamp('last_used_at')->nullable();
            // DATETIME avoids legacy MySQL's implicit TIMESTAMP default rules
            // for NOT NULL columns while retaining the required expiry values.
            $table->dateTime('expires_at')->index();
            $table->dateTime('absolute_expires_at')->index();
            $table->timestamp('revoked_at')->nullable()->index();
            $table->string('revoked_reason', 80)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('student_device_binding_id')->references('id')->on('student_device_bindings')->cascadeOnDelete();
            $table->foreign('replaced_by_id')->references('id')->on('student_refresh_sessions')->nullOnDelete();
            $table->index(['user_id', 'revoked_at', 'expires_at'], 'student_refresh_user_active_index');
            $table->index(['family_id', 'revoked_at'], 'student_refresh_family_revoked_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_refresh_sessions');
    }
};
