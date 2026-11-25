<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('student_device_bindings', 'fingerprint_model_key')) {
            Schema::table('student_device_bindings', function (Blueprint $table) {
                $table->string('fingerprint_model_key', 64)->nullable()->index();
            });
        }
        if (! Schema::hasColumn('student_device_bindings', 'fingerprint_screen_key')) {
            Schema::table('student_device_bindings', function (Blueprint $table) {
                $table->string('fingerprint_screen_key', 64)->nullable()->index();
            });
        }
        if (! Schema::hasColumn('student_device_bindings', 'fingerprint_graphics_key')) {
            Schema::table('student_device_bindings', function (Blueprint $table) {
                $table->string('fingerprint_graphics_key', 64)->nullable()->index();
            });
        }

        $normalize = static function (mixed $value): string|float|int|null {
            if (is_string($value)) {
                $normalized = strtolower(trim(preg_replace('/\s+/', ' ', $value) ?? $value));

                return $normalized === '' ? null : $normalized;
            }

            return is_int($value) || is_float($value) ? $value : null;
        };
        $hashParts = static function (array $parts, int $minimumPresent) use ($normalize): ?string {
            $normalized = array_map($normalize, $parts);
            if (count(array_filter($normalized, fn ($value) => $value !== null)) < $minimumPresent) {
                return null;
            }

            return hash('sha256', implode('|', array_map(
                fn ($value) => $value === null ? '-' : (string) $value,
                $normalized,
            )));
        };

        DB::table('student_device_bindings')
            ->select(['id', 'user_id', 'email', 'device_identifier', 'device_fingerprint'])
            ->whereNotNull('device_fingerprint')
            ->orderBy('id')
            ->chunkById(500, function ($bindings) use ($hashParts): void {
                $updates = [];

                foreach ($bindings as $binding) {
                    $fingerprint = json_decode((string) $binding->device_fingerprint, true);
                    if (! is_array($fingerprint)) continue;

                    $updates[] = [
                        'id' => $binding->id,
                        // MySQL validates required insert columns before taking
                        // the duplicate-key update path, so include them even
                        // though only the lookup keys are updated.
                        'user_id' => $binding->user_id,
                        'email' => $binding->email,
                        'device_identifier' => $binding->device_identifier,
                        'fingerprint_model_key' => $hashParts([
                            $fingerprint['platform'] ?? null,
                            $fingerprint['model'] ?? null,
                        ], 2),
                        'fingerprint_screen_key' => $hashParts([
                            $fingerprint['screenResolution'] ?? null,
                        ], 1),
                        'fingerprint_graphics_key' => $hashParts([
                            $fingerprint['platform'] ?? null,
                            $fingerprint['webglVendor'] ?? null,
                            $fingerprint['webglRenderer'] ?? null,
                        ], 2),
                    ];
                }

                if ($updates !== []) {
                    DB::table('student_device_bindings')->upsert(
                        $updates,
                        ['id'],
                        ['fingerprint_model_key', 'fingerprint_screen_key', 'fingerprint_graphics_key'],
                    );
                }
            });
    }

    public function down(): void
    {
        Schema::table('student_device_bindings', function (Blueprint $table) {
            $table->dropIndex(['fingerprint_model_key']);
            $table->dropIndex(['fingerprint_screen_key']);
            $table->dropIndex(['fingerprint_graphics_key']);
            $table->dropColumn([
                'fingerprint_model_key',
                'fingerprint_screen_key',
                'fingerprint_graphics_key',
            ]);
        });
    }
};
