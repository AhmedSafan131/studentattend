<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\AcademicTerm;
use App\Models\ApiToken;
use App\Services\Auth\AuthService;
use App\Services\Auth\StudentRefreshSessionService;
use App\Services\LocaleService;
use App\Support\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly StudentRefreshSessionService $refreshSessions,
        private readonly LocaleService $locale,
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        [$user, $isTemporaryStaffAccess] = $this->verifiedLoginIdentity($request);
        $validated = $request->validated();
        app(\App\Services\Auth\StudentBrowserPolicy::class)->enforce($request, $user);

        if ($user->role === 'student') {
            $deviceCheck = $this->auth->validateStudentDevice(
                $user,
                $validated,
                $request,
                fn (string $key, Request $currentRequest) => $this->locale->message($key, $currentRequest),
            );
            if ($deviceCheck) {
                return $deviceCheck;
            }
        }

        [$plainToken, $expiresAt] = $this->auth->createFrontendToken($user, $isTemporaryStaffAccess);
        $activeTermCode = AcademicTerm::getActiveTermCode();
        $user->load([
            'courses' => fn ($query) => $query->where('term_code', $activeTermCode),
            'registrations' => fn ($query) => $query->where('term_code', $activeTermCode),
        ]);

        $payload = (new UserResource($user))->toArray($request);
        $payload['success'] = true;
        $payload['message'] = $this->locale->message('auth.login.success', $request);
        $payload['token'] = $plainToken;
        $payload['expiresAt'] = $expiresAt?->toISOString();
        $payload['loginMethod'] = $isTemporaryStaffAccess ? 'temporary_access_code' : 'password';

        $response = response()->json($payload);
        if ($user->role === 'student') {
            $binding = $user->deviceBinding()->firstOrFail();
            [$plainRefreshToken, $refreshSession] = $this->refreshSessions->issue($user, $binding, $request);
            $response->headers->setCookie($this->refreshSessions->cookie($plainRefreshToken, $refreshSession, $request));
        }

        return $response;
    }

    private function verifiedLoginIdentity(LoginRequest $request): array
    {
        $validated = $request->validated();
        $identifier = trim($validated['email']);
        $password = trim($validated['password']);
        $usesCodeInBothFields = Role::normalize($validated['role']) === 'staff'
            && preg_match('/^\d{4}$/', $identifier) === 1
            && hash_equals($identifier, $password);
        $user = $usesCodeInBothFields
            ? $this->auth->findStaffByActiveAccessCode($identifier)
            : $this->auth->findLoginUser($identifier, $validated['role']);
        $isTemporaryStaffAccess = $usesCodeInBothFields
            && $user
            && $this->auth->usesActiveStaffAccessCode($user, $password);

        if (! $user || (! $isTemporaryStaffAccess && ! $this->auth->passwordMatches($user, $password))) {
            throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                'success' => false,
                'message' => $this->locale->message('auth.login.invalid', $request),
            ], 401));
        }

        return [$user, $isTemporaryStaffAccess];
    }

    public function credentialContext(LoginRequest $request): JsonResponse
    {
        [$user] = $this->verifiedLoginIdentity($request);
        app(\App\Services\Auth\StudentBrowserPolicy::class)->enforce($request, $user);

        // Identity context only: no profile, registrations, access token or cookie.
        return response()->json(['role' => $user->role])->header('Cache-Control', 'no-store');
    }

    public function browserPolicy(Request $request): JsonResponse
    {
        $policy = app(\App\Services\Auth\StudentBrowserPolicy::class);
        return response()->json(['enabled' => $policy->enabled(), 'braveDetected' => $policy->detected($request)])
            ->header('Cache-Control', 'no-store');
    }

    public function sessionContext(Request $request): JsonResponse
    {
        $token = $request->bearerToken();
        $user = $token ? ApiToken::with('user')->where('token_hash', hash('sha256', $token))
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->first()?->user : null;
        if (! $user) {
            $plain = (string) $request->cookie(StudentRefreshSessionService::COOKIE_NAME, '');
            $session = $plain ? \App\Models\StudentRefreshSession::with(['user', 'deviceBinding'])
                ->where('token_hash', hash('sha256', $plain))->whereNull('revoked_at')
                ->where('expires_at', '>', now())->where('absolute_expires_at', '>', now())->first() : null;
            if ($session && $session->user?->role === 'student'
                && $session->deviceBinding?->user_id === $session->user_id) $user = $session->user;
        }
        if ($user) app(\App\Services\Auth\StudentBrowserPolicy::class)->enforce($request, $user);
        return response()->json(['role' => $user?->role])->header('Cache-Control', 'no-store');
    }

    public function refresh(Request $request): JsonResponse
    {
        if (! $this->isTrustedBrowserRequest($request)) {
            return response()->json(['message' => 'Invalid refresh request.'], 419);
        }

        $rotated = $this->refreshSessions->rotate(
            (string) $request->cookie(StudentRefreshSessionService::COOKIE_NAME, ''),
            $request,
        );

        if (! $rotated) {
            $response = response()->json(['message' => 'Your student session has expired. Please sign in again.'], 401);
            $response->headers->setCookie($this->refreshSessions->expiredCookie($request));

            return $response;
        }

        [$plainRefreshToken, $refreshSession, $user] = $rotated;
        [$plainAccessToken, $accessExpiresAt] = $this->auth->createFrontendToken($user);
        $response = response()->json($this->authenticatedStudentPayload($request, $user, $plainAccessToken, $accessExpiresAt));
        $response->headers->setCookie($this->refreshSessions->cookie($plainRefreshToken, $refreshSession, $request));

        return $response;
    }

    public function upgradeStudentSession(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'student') {
            return response()->json(['message' => 'Only student sessions can be upgraded.'], 403);
        }

        $binding = $user->deviceBinding()->first();
        if (! $binding) {
            return response()->json(['message' => 'This student device is no longer active.'], 409);
        }

        [$plainRefreshToken, $refreshSession] = $this->refreshSessions->issue($user, $binding, $request);
        [$plainAccessToken, $accessExpiresAt] = $this->auth->createFrontendToken($user);

        $legacyToken = $request->attributes->get('auth_api_token');
        if ($legacyToken instanceof ApiToken) {
            $legacyToken->forceFill(['expires_at' => now()->addMinutes(15)])->save();
        }

        $response = response()->json($this->authenticatedStudentPayload($request, $user, $plainAccessToken, $accessExpiresAt));
        $response->headers->setCookie($this->refreshSessions->cookie($plainRefreshToken, $refreshSession, $request));

        return $response;
    }

    public function logout(Request $request): JsonResponse
    {
        if (! $this->isTrustedBrowserRequest($request)) {
            return response()->json(['message' => 'Invalid logout request.'], 419);
        }

        $this->refreshSessions->revokeToken(
            (string) $request->cookie(StudentRefreshSessionService::COOKIE_NAME, ''),
            'logout',
        );

        $header = (string) $request->header('Authorization', '');
        if (str_starts_with($header, 'Bearer ')) {
            ApiToken::query()->where('token_hash', hash('sha256', substr($header, 7)))->delete();
        }

        $response = response()->json(['message' => 'Signed out successfully.']);
        $response->headers->setCookie($this->refreshSessions->expiredCookie($request));

        return $response;
    }

    public function me(Request $request): UserResource
    {
        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: AcademicTerm::getActiveTermCode();

        return new UserResource($request->user()->load([
            'courses' => fn ($query) => $query->where('term_code', $termCode),
            'registrations' => fn ($query) => $query->where('term_code', $termCode),
        ]));
    }

    private function authenticatedStudentPayload(Request $request, $user, string $plainAccessToken, $accessExpiresAt): array
    {
        $activeTermCode = AcademicTerm::getActiveTermCode();
        $user->load([
            'courses' => fn ($query) => $query->where('term_code', $activeTermCode),
            'registrations' => fn ($query) => $query->where('term_code', $activeTermCode),
        ]);

        return [
            ...(new UserResource($user))->toArray($request),
            'success' => true,
            'token' => $plainAccessToken,
            'expiresAt' => $accessExpiresAt?->toISOString(),
            'loginMethod' => 'refresh_session',
        ];
    }

    private function isTrustedBrowserRequest(Request $request): bool
    {
        return $request->header('X-Requested-With') === 'XMLHttpRequest';
    }

    public function createStaffAccessCode(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'staff') {
            return response()->json(['message' => 'Only staff accounts can create a temporary access code.'], 403);
        }

        // A replacement code immediately invalidates the previous code and all sessions opened with it.
        [$accessCode, $expiresAt] = $this->auth->createUniqueStaffAccessCode($user);

        return response()->json([
            'data' => [
                'code' => $accessCode,
                'expiresAt' => $expiresAt->toISOString(),
            ],
        ]);
    }

    public function staffAccessCodeStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'staff') {
            return response()->json(['message' => 'Only staff accounts can view a temporary access code status.'], 403);
        }

        $expiresAt = $user->temporary_login_code_expires_at;

        return response()->json([
            'data' => [
                // The code itself is never returned after generation; the browser only uses this to validate its saved display state.
                'expiresAt' => $expiresAt?->isFuture() ? $expiresAt->toISOString() : null,
            ],
        ]);
    }

    public function revokeStaffAccessCode(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'staff') {
            return response()->json(['message' => 'Only staff accounts can revoke a temporary access code.'], 403);
        }

        return response()->json([
            'data' => [
                'revokedSessions' => $this->auth->revokeStaffAccessCode($user),
            ],
        ]);
    }
}
