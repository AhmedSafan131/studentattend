<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\StudentRefreshSession;
use App\Models\User;
use App\Services\Auth\StudentRefreshSessionService;
use Illuminate\Support\Str;
use Tests\TestCase;

class StudentRefreshSessionTest extends TestCase
{
    public function test_student_login_sets_http_only_refresh_cookie_and_short_lived_access_token(): void
    {
        $this->artisan('migrate:fresh --seed');

        $response = $this->studentLogin('refresh-login-device')->assertOk();

        $cookie = $this->refreshCookie($response);
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertFalse($cookie->isSecure());
        $this->assertSame('/api/auth', $cookie->getPath());
        $this->assertSame('strict', $cookie->getSameSite());
        $this->assertNotSame('', $cookie->getValue());
        $this->assertNotNull($response->json('expiresAt'));
        $this->assertDatabaseHas('student_refresh_sessions', [
            'user_id' => 'student-1',
            'revoked_at' => null,
        ]);
    }

    public function test_student_refresh_cookie_is_secure_when_https_is_forwarded_by_the_frontend_proxy(): void
    {
        $this->artisan('migrate:fresh --seed');

        $response = $this
            ->withHeader('X-Forwarded-Proto', 'https')
            ->withHeader('X-Requested-With', 'XMLHttpRequest')
            ->postJson('/api/auth/login', [
                'email' => 'student',
                'password' => '123',
                'role' => 'student',
                'deviceIdentifier' => 'https-refresh-cookie-device',
                'deviceName' => 'Test PWA',
                'platform' => 'Android',
                'browser' => 'Chrome',
            ])
            ->assertOk();

        $cookie = $this->refreshCookie($response);
        $this->assertTrue($cookie->isSecure());
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('strict', $cookie->getSameSite());
    }

    public function test_student_refresh_cookie_uses_the_public_application_base_path(): void
    {
        $this->artisan('migrate:fresh --seed');

        $response = $this
            ->withHeaders([
                'X-App-Base-Path' => '/attendance',
                'X-Forwarded-Proto' => 'https',
                'X-Requested-With' => 'XMLHttpRequest',
            ])
            ->postJson('/api/auth/login', [
                'email' => 'student',
                'password' => '123',
                'role' => 'student',
                'deviceIdentifier' => 'prefixed-refresh-cookie-device',
                'deviceName' => 'Test PWA',
                'platform' => 'Android',
                'browser' => 'Chrome',
            ])
            ->assertOk();

        $cookie = $this->refreshCookie($response);
        $this->assertSame('/attendance/api/auth', $cookie->getPath());
        $this->assertTrue($cookie->isSecure());
    }

    public function test_public_application_base_path_repairs_the_legacy_cookie_path_setting(): void
    {
        $this->artisan('migrate:fresh --seed');
        config()->set('auth.student_refresh.cookie_path', '/api/auth');

        $response = $this
            ->withHeaders([
                'X-App-Base-Path' => '/attendance',
                'X-Forwarded-Proto' => 'https',
                'X-Requested-With' => 'XMLHttpRequest',
            ])
            ->postJson('/api/auth/login', [
                'email' => 'student',
                'password' => '123',
                'role' => 'student',
                'deviceIdentifier' => 'legacy-cookie-path-device',
                'deviceName' => 'Test PWA',
                'platform' => 'Android',
                'browser' => 'Chrome',
            ])
            ->assertOk();

        $cookie = $this->refreshCookie($response);
        $this->assertSame('/attendance/api/auth', $cookie->getPath());
        $this->assertTrue($cookie->isSecure());
    }

    public function test_cross_origin_https_login_uses_a_secure_same_site_none_refresh_cookie(): void
    {
        $this->artisan('migrate:fresh --seed');
        // Simulate a production server retaining the old strict setting after
        // the application code is deployed.
        config()->set('auth.student_refresh.same_site', 'strict');

        $response = $this
            ->withHeaders([
                'Origin' => 'https://students.example.edu',
                'X-Forwarded-Proto' => 'https',
                'X-Requested-With' => 'XMLHttpRequest',
            ])
            ->postJson('/api/auth/login', [
                'email' => 'student',
                'password' => '123',
                'role' => 'student',
                'deviceIdentifier' => 'cross-origin-refresh-cookie-device',
                'deviceName' => 'Test PWA',
                'platform' => 'Android',
                'browser' => 'Chrome',
            ])
            ->assertOk();

        $cookie = $this->refreshCookie($response);
        $this->assertTrue($cookie->isSecure());
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('none', $cookie->getSameSite());
    }

    public function test_refresh_rotates_cookie_and_reused_cookie_revokes_the_whole_family(): void
    {
        $this->artisan('migrate:fresh --seed');

        $login = $this->studentLogin('refresh-rotation-device')->assertOk();
        $firstRefreshToken = $this->refreshCookie($login)->getValue();
        $firstAccessToken = $login->json('token');
        $refresh = $this
            ->withCredentials()
            ->withHeader('X-Requested-With', 'XMLHttpRequest')
            ->withUnencryptedCookie(StudentRefreshSessionService::COOKIE_NAME, $firstRefreshToken)
            ->postJson('/api/auth/refresh')
            ->assertOk()
            ->assertJsonPath('userRole', 'student');

        $secondRefreshToken = $this->refreshCookie($refresh)->getValue();
        $this->assertNotSame($firstRefreshToken, $secondRefreshToken);
        $this->assertNotSame($firstAccessToken, $refresh->json('token'));

        $this
            ->withCredentials()
            ->withHeader('X-Requested-With', 'XMLHttpRequest')
            ->withUnencryptedCookie(StudentRefreshSessionService::COOKIE_NAME, $firstRefreshToken)
            ->postJson('/api/auth/refresh')
            ->assertUnauthorized();

        $this
            ->withCredentials()
            ->withHeader('X-Requested-With', 'XMLHttpRequest')
            ->withUnencryptedCookie(StudentRefreshSessionService::COOKIE_NAME, $secondRefreshToken)
            ->postJson('/api/auth/refresh')
            ->assertUnauthorized();

        $this->assertSame(0, StudentRefreshSession::query()->whereNull('revoked_at')->count());
    }

    public function test_existing_student_bearer_session_can_upgrade_without_signing_in_again(): void
    {
        $this->artisan('migrate:fresh --seed');

        $this->studentLogin('legacy-upgrade-device')->assertOk();
        StudentRefreshSession::query()->delete();
        ApiToken::query()->where('user_id', 'student-1')->delete();

        $legacyPlainToken = Str::random(80);
        ApiToken::query()->create([
            'user_id' => 'student-1',
            'name' => 'frontend',
            'token_hash' => hash('sha256', $legacyPlainToken),
            'expires_at' => null,
        ]);

        $response = $this
            ->withHeaders([
                'Authorization' => "Bearer {$legacyPlainToken}",
                'X-Requested-With' => 'XMLHttpRequest',
            ])
            ->postJson('/api/auth/upgrade-student-session')
            ->assertOk()
            ->assertJsonPath('userRole', 'student');

        $this->assertNotSame($legacyPlainToken, $response->json('token'));
        $this->assertNotNull(ApiToken::query()->where('token_hash', hash('sha256', $legacyPlainToken))->value('expires_at'));
        $this->assertNotSame('', $this->refreshCookie($response)->getValue());
    }

    public function test_removing_student_device_invalidates_refresh_session(): void
    {
        $this->artisan('migrate:fresh --seed');

        $studentLogin = $this->studentLogin('refresh-revocation-device')->assertOk();
        $refreshToken = $this->refreshCookie($studentLogin)->getValue();
        $adminToken = $this->postJson('/api/auth/login', [
            'email' => 'a',
            'password' => '123',
            'role' => 'admin',
        ])->assertOk()->json('token');
        $bindingId = User::query()->findOrFail('student-1')->deviceBinding()->value('id');

        $this
            ->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/students/locked/{$bindingId}/activate")
            ->assertOk();

        $this
            ->withCredentials()
            ->withHeader('X-Requested-With', 'XMLHttpRequest')
            ->withUnencryptedCookie(StudentRefreshSessionService::COOKIE_NAME, $refreshToken)
            ->postJson('/api/auth/refresh')
            ->assertUnauthorized();
    }

    private function studentLogin(string $deviceIdentifier)
    {
        return $this->withHeader('X-Requested-With', 'XMLHttpRequest')->postJson('/api/auth/login', [
            'email' => 'student',
            'password' => '123',
            'role' => 'student',
            'deviceIdentifier' => $deviceIdentifier,
            'deviceName' => 'Test PWA',
            'platform' => 'Android',
            'browser' => 'Chrome',
        ]);
    }

    private function refreshCookie($response)
    {
        return collect($response->headers->getCookies())
            ->first(fn ($cookie) => $cookie->getName() === StudentRefreshSessionService::COOKIE_NAME);
    }
}
