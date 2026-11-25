<?php

namespace App\Services\Auth;

use App\Models\StudentDeviceBinding;
use App\Models\StudentRefreshSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie;

class StudentRefreshSessionService
{
    public const COOKIE_NAME = 'mnu_attend_refresh';

    public function issue(User $student, StudentDeviceBinding $binding, Request $request): array
    {
        return DB::transaction(function () use ($student, $binding, $request) {
            StudentRefreshSession::query()
                ->where('student_device_binding_id', $binding->id)
                ->whereNull('revoked_at')
                ->update([
                    'revoked_at' => now(),
                    'revoked_reason' => 'replaced_by_login',
                ]);

            return $this->createSession($student, $binding, $request);
        });
    }

    public function rotate(string $plainToken, Request $request): ?array
    {
        if ($plainToken === '') {
            return null;
        }

        return DB::transaction(function () use ($plainToken, $request) {
            $session = StudentRefreshSession::query()
                ->with(['user', 'deviceBinding'])
                ->where('token_hash', hash('sha256', $plainToken))
                ->lockForUpdate()
                ->first();

            if (! $session || ! $session->user || ! $session->deviceBinding) {
                return null;
            }

            if ($session->revoked_at) {
                if ($session->replaced_by_id) {
                    $this->revokeFamily($session->family_id, 'refresh_token_reuse');
                }

                return null;
            }

            if ($session->expires_at->isPast() || $session->absolute_expires_at->isPast()) {
                $session->forceFill([
                    'revoked_at' => now(),
                    'revoked_reason' => 'expired',
                ])->save();

                return null;
            }

            if ($session->user->role !== 'student'
                || $session->deviceBinding->user_id !== $session->user_id) {
                $this->revokeFamily($session->family_id, 'device_binding_invalid');

                return null;
            }

            app(StudentBrowserPolicy::class)->enforce($request, $session->user);

            [$plainReplacement, $replacement] = $this->createSession(
                $session->user,
                $session->deviceBinding,
                $request,
                $session->family_id,
                $session->absolute_expires_at,
            );

            $session->forceFill([
                'last_used_at' => now(),
                'revoked_at' => now(),
                'revoked_reason' => 'rotated',
                'replaced_by_id' => $replacement->id,
            ])->save();

            return [$plainReplacement, $replacement, $session->user];
        });
    }

    public function revokeToken(string $plainToken, string $reason = 'logout'): void
    {
        if ($plainToken === '') return;

        $session = StudentRefreshSession::query()
            ->where('token_hash', hash('sha256', $plainToken))
            ->first();

        if ($session) {
            $this->revokeFamily($session->family_id, $reason);
        }
    }

    public function revokeForStudents(iterable $studentIds, string $reason): int
    {
        return StudentRefreshSession::query()
            ->whereIn('user_id', collect($studentIds)->filter()->unique()->values()->all())
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now(), 'revoked_reason' => $reason]);
    }

    public function cookie(string $plainToken, StudentRefreshSession $session, Request $request): Cookie
    {
        return Cookie::create(self::COOKIE_NAME)
            ->withValue($plainToken)
            ->withExpires($session->absolute_expires_at)
            ->withPath($this->cookiePath($request))
            ->withSecure($this->shouldUseSecureCookie($request))
            ->withHttpOnly(true)
            ->withSameSite($this->sameSitePolicy($request));
    }

    public function expiredCookie(Request $request): Cookie
    {
        return Cookie::create(self::COOKIE_NAME)
            ->withValue('')
            ->withExpires(now()->subYear())
            ->withPath($this->cookiePath($request))
            ->withSecure($this->shouldUseSecureCookie($request))
            ->withHttpOnly(true)
            ->withSameSite($this->sameSitePolicy($request));
    }

    private function shouldUseSecureCookie(Request $request): bool
    {
        $configured = config('auth.student_refresh.secure_cookie', 'auto');

        if (is_bool($configured)) {
            return $configured;
        }

        $normalized = strtolower(trim((string) $configured));
        if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
            return true;
        }
        if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
            return false;
        }

        $forwardedProtocol = strtolower(trim(explode(',', (string) $request->header('X-Forwarded-Proto', ''))[0]));

        return $request->isSecure() || $forwardedProtocol === 'https';
    }

    private function cookiePath(Request $request): string
    {
        $publicBasePath = $this->normalizePublicBasePath((string) ($request->header('X-App-Base-Path')
            ?: $request->header('X-Forwarded-Prefix', '')));
        $configured = trim((string) config('auth.student_refresh.cookie_path', 'auto'));
        if ($configured !== '' && strtolower($configured) !== 'auto') {
            $configuredPath = $this->normalizePublicBasePath($configured, true);

            // Older deployments used /api/auth before the application was
            // mounted below /attendance. Honour the browser-facing prefix so
            // a stale cached .env cannot make the refresh cookie invisible to
            // /attendance/api/auth/refresh.
            if ($publicBasePath !== '' && $configuredPath === '/api/auth') {
                return $publicBasePath.$configuredPath;
            }

            return $configuredPath;
        }

        return $publicBasePath.'/api/auth';
    }

    private function normalizePublicBasePath(string $path, bool $isFullCookiePath = false): string
    {
        $path = '/'.trim(str_replace('\\', '/', $path), '/');
        if ($path === '/' || str_contains($path, '..')) {
            return $isFullCookiePath ? '/api/auth' : '';
        }

        // Cookie paths are not URL-decoded by browsers. Limit the value to a
        // normal public URL path and ignore malformed client/proxy headers.
        if (preg_match('#^/[A-Za-z0-9._~!$&\'()*+,;=:@%/-]+$#', $path) !== 1) {
            return $isFullCookiePath ? '/api/auth' : '';
        }

        return $path;
    }

    private function sameSitePolicy(Request $request): string
    {
        $configured = strtolower(trim((string) config('auth.student_refresh.same_site', 'auto')));
        $originHost = parse_url((string) $request->header('Origin', ''), PHP_URL_HOST);
        $requestHost = $request->getHost();
        $isSecureCrossOrigin = $originHost
            && ! hash_equals(strtolower($requestHost), strtolower((string) $originHost))
            && $this->shouldUseSecureCookie($request);

        // Cross-origin production deployments need SameSite=None for the
        // credentialed refresh request. Browsers require that policy to be
        // paired with Secure. Adapt even when an older production .env still
        // says "strict" so deploying this fix does not require replacing it.
        if ($isSecureCrossOrigin && (bool) config('auth.student_refresh.adapt_same_site_to_origin', true)) {
            return Cookie::SAMESITE_NONE;
        }

        if (in_array($configured, [Cookie::SAMESITE_LAX, Cookie::SAMESITE_STRICT, Cookie::SAMESITE_NONE], true)) {
            return $configured;
        }

        return Cookie::SAMESITE_STRICT;
    }

    private function createSession(
        User $student,
        StudentDeviceBinding $binding,
        Request $request,
        ?string $familyId = null,
        mixed $absoluteExpiresAt = null,
    ): array {
        $plainToken = Str::random(96);
        $absoluteExpiresAt ??= now()->addDays((int) config('auth.student_refresh.absolute_days', 365));
        $idleExpiry = now()->addDays((int) config('auth.student_refresh.idle_days', 90));
        $expiresAt = $idleExpiry->lessThan($absoluteExpiresAt) ? $idleExpiry : $absoluteExpiresAt->copy();

        $session = StudentRefreshSession::query()->create([
            'user_id' => $student->id,
            'student_device_binding_id' => $binding->id,
            'family_id' => $familyId ?: (string) Str::uuid(),
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => $expiresAt,
            'absolute_expires_at' => $absoluteExpiresAt,
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
        ]);

        return [$plainToken, $session];
    }

    private function revokeFamily(string $familyId, string $reason): void
    {
        StudentRefreshSession::query()
            ->where('family_id', $familyId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now(), 'revoked_reason' => $reason]);
    }
}
