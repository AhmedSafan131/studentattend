<?php

namespace App\Services\Auth;

use App\Models\AcademicTerm;
use App\Models\ApiToken;
use App\Models\StudentDeviceBinding;
use App\Models\User;
use App\Support\Role;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthService
{
    public const TEMPORARY_STAFF_ACCESS_TOKEN_NAME = 'frontend-temporary-staff-access';

    public function __construct(
        private readonly DeviceFingerprintService $deviceFingerprints,
        private readonly StudentLoginOptionsService $studentLoginOptions,
    ) {}

    public function findLoginUser(string $email, string $role): ?User
    {
        $normalizedRole = Role::normalize($role);
        $roles = $normalizedRole === 'staff' ? ['staff', 'doctor'] : [$normalizedRole];
        $identifier = strtolower(trim($email));

        if ($normalizedRole === 'student') {
            return User::query()
                ->with('courses', 'registrations')
                ->where('role', 'student')
                ->where(function ($query) use ($identifier) {
                    $query
                        ->whereRaw('LOWER(email) = ?', [$identifier])
                        ->orWhereRaw('LOWER(student_id) = ?', [$identifier])
                        ->orWhereRaw('LOWER(university_id) = ?', [$identifier])
                        ->orWhereRaw('LOWER(national_id) = ?', [$identifier]);
                })
                ->first();
        }

        return User::query()
            ->with('courses', 'registrations')
            ->whereIn('role', $roles)
            ->where(function ($query) use ($identifier) {
                $query
                    ->whereRaw('LOWER(email) = ?', [$identifier])
                    ->orWhereRaw('LOWER(national_id) = ?', [$identifier]);
            })
            ->first();
    }

    public function passwordMatches(User $user, string $password): bool
    {
        if (Hash::isHashed($user->password)) {
            if (Hash::check($password, $user->password)) {
                return true;
            }

            // Some imported records may carry valid password hashes that do not
            // match the currently configured Laravel hasher driver. Native PHP
            // verification lets those users sign in once, then we re-store the
            // password through the model cast so future logins use the current
            // hashing configuration.
            if (password_verify($password, (string) $user->password)) {
                $user->forceFill(['password' => $password])->save();

                return true;
            }
        }

        if ($user->role === 'student' && $this->matchesStudentDefaultPassword($user, $password)) {
            $user->forceFill(['password' => $password])->save();

            return true;
        }

        if (hash_equals((string) $user->password, $password)) {
            $user->forceFill(['password' => $password])->save();

            return true;
        }

        return false;
    }

    private function matchesStudentDefaultPassword(User $user, string $password): bool
    {
        $normalizedPassword = trim($password);

        return collect([$user->student_id, $user->university_id, $user->national_id])
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->contains(fn ($value) => hash_equals($value, $normalizedPassword));
    }

    public function usesActiveStaffAccessCode(User $user, string $password): bool
    {
        return $user->role === 'staff'
            && preg_match('/^\\d{4}$/', $password) === 1
            && filled($user->temporary_login_code_hash)
            && $user->temporary_login_code_expires_at?->isFuture()
            && Hash::check($password, $user->temporary_login_code_hash);
    }

    public function findStaffByActiveAccessCode(string $accessCode): ?User
    {
        $accessCode = trim($accessCode);

        if (preg_match('/^\d{4}$/', $accessCode) !== 1) {
            return null;
        }

        $user = User::query()
            ->with('courses', 'registrations')
            ->where('role', 'staff')
            ->where('temporary_login_code_digest', $this->staffAccessCodeDigest($accessCode))
            ->where('temporary_login_code_expires_at', '>', now())
            ->first();

        return $user && $this->usesActiveStaffAccessCode($user, $accessCode) ? $user : null;
    }

    public function createUniqueStaffAccessCode(User $user): array
    {
        $this->revokeStaffAccessCode($user);

        User::query()
            ->whereNotNull('temporary_login_code_digest')
            ->where('temporary_login_code_expires_at', '<=', now())
            ->update([
                'temporary_login_code_hash' => null,
                'temporary_login_code_digest' => null,
                'temporary_login_code_expires_at' => null,
            ]);

        for ($attempt = 0; $attempt < 100; $attempt++) {
            $accessCode = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            $digest = $this->staffAccessCodeDigest($accessCode);
            $expiresAt = now()->addMinutes(10);

            try {
                $created = DB::transaction(function () use ($user, $accessCode, $digest, $expiresAt): bool {
                    $codeIsActive = User::query()
                        ->where('temporary_login_code_digest', $digest)
                        ->where('temporary_login_code_expires_at', '>', now())
                        ->exists();

                    if ($codeIsActive) {
                        return false;
                    }

                    User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail()->forceFill([
                        'temporary_login_code_hash' => Hash::make($accessCode),
                        'temporary_login_code_digest' => $digest,
                        'temporary_login_code_expires_at' => $expiresAt,
                    ])->save();

                    return true;
                });

                if ($created) {
                    $user->refresh();

                    return [$accessCode, $expiresAt];
                }
            } catch (QueryException $exception) {
                // The unique index resolves concurrent requests that happened to
                // generate the same four-digit code. Retry with another value.
                if (! $this->isUniqueConstraintViolation($exception)) {
                    throw $exception;
                }
            }
        }

        throw new \RuntimeException('No temporary staff access code is currently available.');
    }

    public function createFrontendToken(User $user, bool $isTemporaryStaffAccess = false): array
    {
        // Refreshing a student session creates short-lived access tokens. Prune
        // expired rows here so long-running devices do not grow api_tokens forever.
        ApiToken::query()
            ->where('user_id', $user->id)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->delete();

        $plainToken = Str::random(80);
        $isTemporaryStaffAccess = $isTemporaryStaffAccess
            && $user->role === 'staff'
            && $user->temporary_login_code_expires_at?->isFuture();
        $expiresAt = $isTemporaryStaffAccess
            ? $user->temporary_login_code_expires_at
            : match ($user->role) {
                'admin' => now()->addHours(24),
                'student' => now()->addMinutes((int) config('auth.student_access_token_minutes', 15)),
                'staff', 'doctor' => null,
                default => now()->addMinutes((int) config('auth.api_token_minutes', 60)),
            };

        ApiToken::query()->create([
            'user_id' => $user->id,
            'name' => $isTemporaryStaffAccess ? self::TEMPORARY_STAFF_ACCESS_TOKEN_NAME : 'frontend',
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => $expiresAt,
        ]);

        return [$plainToken, $expiresAt];
    }

    public function revokeStaffAccessCode(User $user): int
    {
        $revokedSessions = ApiToken::query()
            ->where('user_id', $user->id)
            ->where('name', self::TEMPORARY_STAFF_ACCESS_TOKEN_NAME)
            ->delete();

        $user->forceFill([
            'temporary_login_code_hash' => null,
            'temporary_login_code_digest' => null,
            'temporary_login_code_expires_at' => null,
        ])->save();

        return $revokedSessions;
    }

    private function staffAccessCodeDigest(string $accessCode): string
    {
        return hash_hmac('sha256', $accessCode, (string) config('app.key'));
    }

    private function isUniqueConstraintViolation(QueryException $exception): bool
    {
        return in_array((string) $exception->getCode(), ['19', '23000', '23505'], true);
    }

    public function validateStudentDevice(User $user, array $validated, Request $request, callable $message): ?JsonResponse
    {
        $deviceIdentifier = trim((string) ($validated['deviceIdentifier'] ?? ''));
        $deviceFingerprint = $validated['deviceFingerprint'] ?? null;
        $normalizedFingerprint = is_array($deviceFingerprint) ? $deviceFingerprint : null;
        $fingerprintKeys = $this->deviceFingerprints->lookupKeys($normalizedFingerprint);

        if ($deviceIdentifier === '') {
            return response()->json([
                'success' => false,
                'message' => $message('auth.login.student_device_required', $request),
            ], 400);
        }

        if (! $this->studentLoginOptions->deviceFingerprintProtectionEnabled()) {
            return $this->storeUnrestrictedStudentBinding(
                $user,
                $validated,
                $deviceIdentifier,
                $normalizedFingerprint,
            );
        }

        $crossAccountProtectionEnabled = $this->studentLoginOptions->crossAccountDeviceProtectionEnabled();
        $storedDeviceIdentifier = $crossAccountProtectionEnabled
            ? $deviceIdentifier
            : $this->studentScopedDeviceIdentifier($user, $deviceIdentifier);

        return DB::transaction(function () use ($user, $validated, $request, $message, $deviceIdentifier, $storedDeviceIdentifier, $deviceFingerprint, $normalizedFingerprint, $fingerprintKeys, $crossAccountProtectionEnabled) {
            // Serialize first-time and recovery logins for the same student so
            // two browsers cannot both establish a different binding.
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            $deviceUsedByAnotherStudent = $crossAccountProtectionEnabled && (
                StudentDeviceBinding::query()
                    ->where('device_identifier', $deviceIdentifier)
                    ->where('user_id', '!=', $user->id)
                    ->exists()
                || $this->fingerprintUsedByAnotherStudent(
                    $user,
                    $normalizedFingerprint,
                    $fingerprintKeys,
                    $this->studentLoginOptions->crossAccountFingerprintThreshold(),
                )
            );

            if ($deviceUsedByAnotherStudent) {
                return response()->json([
                    'success' => false,
                    'message' => $message('auth.login.device_used', $request),
                ], 401);
            }

            $existingBinding = StudentDeviceBinding::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            $existingIdentifierMatches = $existingBinding && in_array(
                $existingBinding->device_identifier,
                [$deviceIdentifier, $storedDeviceIdentifier],
                true,
            );

            if ($existingBinding && ! $existingIdentifierMatches) {
                $similarity = $this->deviceFingerprints->similarity(
                    $existingBinding->device_fingerprint,
                    is_array($deviceFingerprint) ? $deviceFingerprint : null,
                );

                if ($similarity === null || $similarity < DeviceFingerprintService::MATCH_THRESHOLD) {
                    return response()->json([
                        'success' => false,
                        'message' => $message('auth.login.account_locked', $request),
                    ], 401);
                }

                // The UUID was lost but enough independent characteristics still
                // match. Rotate the binding to the replacement UUID and snapshot.
                $existingBinding->forceFill([
                    'device_identifier' => $storedDeviceIdentifier,
                    'device_fingerprint' => $deviceFingerprint,
                    ...$fingerprintKeys,
                    'device_name' => $validated['deviceName'] ?? $existingBinding->device_name,
                    'platform' => $validated['platform'] ?? $existingBinding->platform,
                    'browser' => $validated['browser'] ?? $existingBinding->browser,
                ])->save();

                return null;
            }

            if ($existingBinding) {
                // This backfills fingerprints for bindings created before this
                // feature, without weakening their existing UUID lock.
                if (is_array($deviceFingerprint) && $deviceFingerprint !== []) {
                    $existingBinding->forceFill([
                        'device_identifier' => $storedDeviceIdentifier,
                        'device_fingerprint' => $deviceFingerprint,
                        ...$fingerprintKeys,
                        'device_name' => $validated['deviceName'] ?? $existingBinding->device_name,
                        'platform' => $validated['platform'] ?? $existingBinding->platform,
                        'browser' => $validated['browser'] ?? $existingBinding->browser,
                    ])->save();
                }

                return null;
            }

            StudentDeviceBinding::query()->create([
                'user_id' => $user->id,
                'email' => $user->email,
                'device_identifier' => $storedDeviceIdentifier,
                'device_name' => $validated['deviceName'] ?? null,
                'platform' => $validated['platform'] ?? null,
                'browser' => $validated['browser'] ?? null,
                'device_fingerprint' => $deviceFingerprint,
                ...$fingerprintKeys,
                'term_code' => AcademicTerm::getActiveTermCode(),
            ]);

            return null;
        });
    }

    private function storeUnrestrictedStudentBinding(
        User $user,
        array $validated,
        string $deviceIdentifier,
        ?array $deviceFingerprint,
    ): ?JsonResponse {
        DB::transaction(function () use ($user, $validated, $deviceIdentifier, $deviceFingerprint): void {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            $binding = StudentDeviceBinding::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            $attributes = [
                // The user id scopes the identifier while protection is off, so
                // multiple students may intentionally use the same browser.
                'device_identifier' => 'unrestricted:'.hash_hmac(
                    'sha256',
                    $user->id.'|'.$deviceIdentifier,
                    (string) config('app.key'),
                ),
                'device_name' => $validated['deviceName'] ?? $binding?->device_name,
                'platform' => $validated['platform'] ?? $binding?->platform,
                'browser' => $validated['browser'] ?? $binding?->browser,
                'device_fingerprint' => $deviceFingerprint,
                ...$this->deviceFingerprints->lookupKeys($deviceFingerprint),
                'term_code' => AcademicTerm::getActiveTermCode(),
            ];

            if ($binding) {
                $binding->forceFill($attributes)->save();

                return;
            }

            StudentDeviceBinding::query()->create([
                ...$attributes,
                'user_id' => $user->id,
                'email' => $user->email,
            ]);
        });

        return null;
    }

    private function studentScopedDeviceIdentifier(User $user, string $deviceIdentifier): string
    {
        return 'shared:'.hash_hmac(
            'sha256',
            $user->id.'|'.$deviceIdentifier,
            (string) config('app.key'),
        );
    }

    private function fingerprintUsedByAnotherStudent(
        User $user,
        ?array $deviceFingerprint,
        array $lookupKeys,
        float $threshold,
    ): bool {
        $lookupKeys = array_filter($lookupKeys, fn ($value) => filled($value));
        if (! $deviceFingerprint || $lookupKeys === []) {
            return false;
        }

        $candidates = StudentDeviceBinding::query()
            ->where('user_id', '!=', $user->id)
            ->where(function ($query) use ($lookupKeys): void {
                foreach ($lookupKeys as $column => $value) {
                    $query->orWhere($column, $value);
                }
            })
            ->get(['id', 'device_fingerprint']);

        return $candidates->contains(fn (StudentDeviceBinding $binding) => (
            ($similarity = $this->deviceFingerprints->similarity(
                $binding->device_fingerprint,
                $deviceFingerprint,
            )) !== null
            && $similarity >= $threshold
        ));
    }
}
