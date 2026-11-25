<?php

namespace App\Services\Attendance;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\SystemSetting;

class AttendanceQrTokenService
{
    private const ACCEPTANCE_SECONDS = 120;
    private const HISTORY_RETENTION_DAYS = 7;
    private const CLOCK_SKEW_SECONDS = 2;
    private const DATABASE_PRUNE_ODDS = 1000;
    private const SESSION_CODE_LENGTH_CACHE_KEY = 'attendance_session_code_length';

    public function issuePair(string $kind, string $sessionId, int $windowSeconds): array
    {
        $validFrom = now();

        return [
            'qrPayload' => $this->issueAt($kind, $sessionId, $windowSeconds, $validFrom),
            'sessionCode' => $this->issueAccessCodeAt($kind, $sessionId, $windowSeconds, $validFrom),
            'issuedAt' => $validFrom,
            'expiresAt' => $validFrom->copy()->addSeconds($windowSeconds),
        ];
    }

    public function issue(string $kind, string $sessionId, int $windowSeconds): string
    {
        return $this->issueAt($kind, $sessionId, $windowSeconds, now());
    }

    private function issueAt(string $kind, string $sessionId, int $windowSeconds, CarbonInterface $validFrom): string
    {
        $prefix = $kind === 'flexible' ? 'FQ' : 'LQ';
        $token = $prefix.'-'.Str::upper(Str::random(10));
        $validUntil = $validFrom->copy()->addSeconds($windowSeconds);

        Cache::put($this->cacheKey($token), [
            'kind' => $kind,
            'sessionId' => $sessionId,
            'issuedAt' => $validFrom->timestamp,
            'validFrom' => $validFrom->toISOString(),
            'validUntil' => $validUntil->toISOString(),
        ], now()->addDays(self::HISTORY_RETENTION_DAYS));

        $this->pruneExpiredDatabaseTokensSometimes();

        return $token;
    }

    public function verifyAccessCode(string $code, ?CarbonInterface $scannedAt = null): ?array
    {
        $code = trim($code);
        if (! preg_match('/^\d{4}(?:\d{2})?$/', $code)) {
            return null;
        }

        $records = Cache::get($this->accessCodeCacheKey($code), []);
        if (! is_array($records)) {
            return null;
        }

        $scanTime = $scannedAt ?? now();
        foreach ($records as $record) {
            if (is_array($record)
                && in_array($record['kind'] ?? null, ['lecture', 'flexible'], true)
                && is_string($record['sessionId'] ?? null)
                && ($record['sessionId'] ?? '') !== ''
                && $this->matchesScanWindow($record, $scanTime)) {
                return $record;
            }
        }

        return null;
    }

    /**
     * Resolve every server-issued record for an access code without using a
     * client-supplied timestamp. The controller applies the offline grace
     * period and rejects ambiguous records belonging to different sessions.
     *
     * @return array<int, array<string, mixed>>
     */
    public function resolveOfflineAccessCodeProofs(string $code): array
    {
        $code = trim($code);
        if (! preg_match('/^\d{4}(?:\d{2})?$/', $code)) {
            return [];
        }

        $records = Cache::get($this->accessCodeCacheKey($code), []);
        if (! is_array($records)) {
            return [];
        }

        return collect($records)
            ->map(fn ($record) => is_array($record) ? $this->normalizeStoredProof($record) : null)
            ->filter()
            ->values()
            ->all();
    }

    private function issueAccessCodeAt(string $kind, string $sessionId, int $windowSeconds, CarbonInterface $validFrom): string
    {
        $validUntil = $validFrom->copy()->addSeconds($windowSeconds);
        $previousCode = (string) Cache::get($this->lastAccessCodeCacheKey($kind, $sessionId), '');

        for ($attempt = 0; $attempt < 100; $attempt++) {
            $length = (int) Cache::rememberForever(self::SESSION_CODE_LENGTH_CACHE_KEY, function () {
                $options = SystemSetting::query()->find('student_login_options')?->value;
                $configured = (int) ($options['sessionCodeLength'] ?? 6);
                return in_array($configured, [4, 6], true) ? $configured : 6;
            });
            $code = str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);
            if ($code === $previousCode) {
                continue;
            }
            $lock = Cache::lock('attendance_code_lock:'.$code, 5);

            try {
                if (! $lock->get()) {
                    continue;
                }

                $key = $this->accessCodeCacheKey($code);
                $records = Cache::get($key, []);
                $records = is_array($records) ? $records : [];
                $retentionStart = now()->subDays(self::HISTORY_RETENTION_DAYS);
                $records = array_values(array_filter($records, static function ($record) use ($retentionStart) {
                    try {
                        return is_array($record)
                            && ! empty($record['validUntil'])
                            && Carbon::parse($record['validUntil'])->greaterThanOrEqualTo($retentionStart);
                    } catch (\Throwable) {
                        return false;
                    }
                }));

                $overlaps = collect($records)->contains(static function ($record) use ($validFrom, $validUntil) {
                    try {
                        $existingFrom = Carbon::parse($record['validFrom']);
                        $existingUntil = Carbon::parse($record['validUntil']);
                        return $existingFrom->lessThanOrEqualTo($validUntil)
                            && $existingUntil->greaterThanOrEqualTo($validFrom);
                    } catch (\Throwable) {
                        return true;
                    }
                });

                if ($overlaps) {
                    continue;
                }

                $records[] = [
                    'kind' => $kind,
                    'sessionId' => $sessionId,
                    'issuedAt' => $validFrom->timestamp,
                    'validFrom' => $validFrom->toISOString(),
                    'validUntil' => $validUntil->toISOString(),
                    'source' => 'session_code',
                ];
                Cache::put($key, $records, now()->addDays(self::HISTORY_RETENTION_DAYS));
                Cache::put(
                    $this->lastAccessCodeCacheKey($kind, $sessionId),
                    $code,
                    now()->addDays(self::HISTORY_RETENTION_DAYS),
                );

                return $code;
            } finally {
                optional($lock)->release();
            }
        }

        throw new \RuntimeException('Could not allocate a unique attendance session code.');
    }

    public function verify(string $token, ?CarbonInterface $scannedAt = null): ?array
    {
        $token = trim($token);
        $cached = Cache::get($this->cacheKey($token));
        if (is_array($cached)
            && in_array($cached['kind'] ?? null, ['lecture', 'flexible'], true)
            && is_string($cached['sessionId'] ?? null)
            && ($cached['sessionId'] ?? '') !== ''
            && $this->matchesScanWindow($cached, $scannedAt ?? now())) {
            return $cached;
        }

        // Keep QR codes already queued by the previous release usable during
        // the short rollout window. Newly issued codes always use LQ-/FQ-.
        return $this->verifyPreviousSignedFormat($token, $scannedAt ?? now());
    }

    /**
     * Resolve a genuine server-issued QR proof without trusting the browser
     * clock. Current opaque tokens are backed by server cache records; the
     * immediately previous AQ1 format remains verifiable by its signature.
     */
    public function resolveOfflineProof(string $token): ?array
    {
        $token = trim($token);
        $cached = Cache::get($this->cacheKey($token));
        if (is_array($cached)) {
            return $this->normalizeStoredProof($cached);
        }

        return $this->parsePreviousSignedFormat($token);
    }

    private function verifyPreviousSignedFormat(string $token, CarbonInterface $scannedAt): ?array
    {
        $data = $this->parsePreviousSignedFormat($token);
        if (! $data) {
            return null;
        }

        // Preserve the original AQ1 compatibility window exactly. It allowed
        // fifteen seconds of forward clock skew and 120 seconds after issue.
        $age = $scannedAt->timestamp - (int) $data['issuedAt'];
        if ($age < -15 || $age > self::ACCEPTANCE_SECONDS) {
            return null;
        }

        return $data;
    }

    private function parsePreviousSignedFormat(string $token): ?array
    {
        $parts = explode('.', trim($token));
        if (count($parts) !== 3 || $parts[0] !== 'AQ1') return null;
        if (! hash_equals($this->signature($parts[1]), $parts[2])) return null;

        try {
            $data = json_decode($this->decode($parts[1]), true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }

        $kind = $data['k'] ?? null;
        $sessionId = $data['s'] ?? null;
        $issuedAt = (int) ($data['i'] ?? 0);
        if (! in_array($kind, ['lecture', 'flexible'], true)
            || ! is_string($sessionId) || $sessionId === ''
            || $issuedAt <= 0) {
            return null;
        }

        $validFrom = Carbon::createFromTimestampUTC($issuedAt);

        return [
            'kind' => $kind,
            'sessionId' => $sessionId,
            'issuedAt' => $issuedAt,
            'validFrom' => $validFrom->toISOString(),
            'validUntil' => $validFrom->copy()->addSeconds(self::ACCEPTANCE_SECONDS)->toISOString(),
            'source' => 'previous_signed_qr',
        ];
    }

    private function normalizeStoredProof(array $record): ?array
    {
        $kind = $record['kind'] ?? null;
        $sessionId = $record['sessionId'] ?? null;
        $issuedAt = (int) ($record['issuedAt'] ?? 0);

        if (! in_array($kind, ['lecture', 'flexible'], true)
            || ! is_string($sessionId) || trim($sessionId) === ''
            || $issuedAt <= 0) {
            return null;
        }

        try {
            $validFrom = ! empty($record['validFrom'])
                ? Carbon::parse($record['validFrom'])
                : Carbon::createFromTimestampUTC($issuedAt);
            $validUntil = ! empty($record['validUntil'])
                ? Carbon::parse($record['validUntil'])
                : $validFrom->copy()->addSeconds(self::ACCEPTANCE_SECONDS);
        } catch (\Throwable) {
            return null;
        }

        if ($validUntil->lessThan($validFrom)) {
            return null;
        }

        return [
            ...$record,
            'kind' => $kind,
            'sessionId' => trim($sessionId),
            'issuedAt' => $issuedAt,
            'validFrom' => $validFrom->toISOString(),
            'validUntil' => $validUntil->toISOString(),
        ];
    }

    private function matchesScanWindow(array $tokenData, CarbonInterface $scannedAt): bool
    {
        if (empty($tokenData['validFrom']) || empty($tokenData['validUntil'])) {
            $issuedAt = (int) ($tokenData['issuedAt'] ?? 0);
            return $issuedAt > 0 && $scannedAt->timestamp >= $issuedAt - self::CLOCK_SKEW_SECONDS
                && $scannedAt->timestamp <= $issuedAt + self::ACCEPTANCE_SECONDS;
        }

        try {
            $validFrom = Carbon::parse($tokenData['validFrom'])->subSeconds(self::CLOCK_SKEW_SECONDS);
            $validUntil = Carbon::parse($tokenData['validUntil'])->addSeconds(self::CLOCK_SKEW_SECONDS);
        } catch (\Throwable) {
            return false;
        }

        return $scannedAt->betweenIncluded($validFrom, $validUntil);
    }

    private function cacheKey(string $token): string
    {
        return 'attendance_qr:'.hash('sha256', $token);
    }

    private function accessCodeCacheKey(string $code): string
    {
        return 'attendance_code:'.$code;
    }

    private function lastAccessCodeCacheKey(string $kind, string $sessionId): string
    {
        return 'attendance_code_last:'.$kind.':'.hash('sha256', $sessionId);
    }

    private function pruneExpiredDatabaseTokensSometimes(): void
    {
        if (config('cache.default') !== 'database' || random_int(1, self::DATABASE_PRUNE_ODDS) !== 1) {
            return;
        }

        try {
            $store = (array) config('cache.stores.database', []);
            DB::connection($store['connection'] ?? null)
                ->table($store['table'] ?? 'cache')
                ->where('expiration', '<=', now()->timestamp)
                ->where('key', 'like', '%attendance_qr:%')
                ->limit(5000)
                ->delete();
        } catch (\Throwable) {
            // Token generation must not fail merely because best-effort cleanup failed.
        }
    }

    private function signature(string $payload): string
    {
        return $this->encode(hash_hmac('sha256', $payload, $this->key(), true));
    }

    private function key(): string
    {
        $key = (string) config('app.key');
        if (str_starts_with($key, 'base64:')) {
            return base64_decode(substr($key, 7), true) ?: $key;
        }
        return $key;
    }

    private function encode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function decode(string $value): string
    {
        $padding = (4 - strlen($value) % 4) % 4;
        $decoded = base64_decode(strtr($value.str_repeat('=', $padding), '-_', '+/'), true);
        if ($decoded === false) throw new \RuntimeException('Invalid token encoding.');
        return $decoded;
    }
}
