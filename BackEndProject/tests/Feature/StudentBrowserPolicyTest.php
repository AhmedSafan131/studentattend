<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\StudentRefreshSession;
use App\Models\User;
use App\Services\Auth\StudentBrowserPolicy;
use App\Services\Auth\StudentLoginOptionsService;
use App\Services\Auth\StudentRefreshSessionService;
use Tests\TestCase;

class StudentBrowserPolicyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate:fresh --seed');
        app(StudentLoginOptionsService::class)->update(['blockBraveForStudents' => true]);
    }

    private function credentials(string $role = 'student'): array
    {
        return ['email' => $role === 'student' ? 'student' : ($role === 'admin' ? 'a' : 'staff'),
            'password' => '123', 'role' => $role, 'deviceIdentifier' => 'policy-test-device'];
    }

    private function brave(): static
    {
        return $this->withHeaders(['User-Agent' => 'Mozilla/5.0 Chrome/140.0 Safari/537.36',
            'Sec-CH-UA' => '"Chromium";v="140", "Brave";v="140"']);
    }

    public function test_blocked_login_returns_no_student_data_cookie_token_or_device_binding(): void
    {
        $this->brave()->postJson('/api/auth/login', $this->credentials())->assertForbidden()
            ->assertExactJson(['errorCode' => StudentBrowserPolicy::ERROR_CODE, 'message' => StudentBrowserPolicy::MESSAGE]);
        $this->assertDatabaseCount('api_tokens', 0);
        $this->assertDatabaseCount('student_refresh_sessions', 0);
        $this->assertDatabaseCount('student_device_bindings', 0);
        // Caller-supplied negative browser flags are never permission.
        $this->withHeader('X-Is-Brave', 'false')->postJson('/api/auth/login', $this->credentials() + ['isBrave' => false])
            ->assertForbidden();
    }

    public function test_existing_student_tokens_are_blocked_on_shared_and_student_endpoints(): void
    {
        $token = $this->postJson('/api/auth/login', $this->credentials())->assertOk()->json('token');
        $this->brave()->withHeader('Authorization', 'Bearer '.$token);
        foreach (['/api/auth/me', '/api/attendance/my', '/api/terms', '/api/catalog/subjects'] as $url) {
            $this->getJson($url)->assertForbidden()->assertJsonPath('errorCode', StudentBrowserPolicy::ERROR_CODE);
        }
        foreach (['/api/attendance/scan', '/api/attendance/scan-status', '/api/auth/upgrade-student-session'] as $url) {
            $this->postJson($url, [])->assertForbidden()->assertJsonPath('errorCode', StudentBrowserPolicy::ERROR_CODE);
        }
        $this->assertDatabaseCount('attendance_records', 0);
        $this->withHeader('X-Requested-With', 'XMLHttpRequest')->postJson('/api/auth/logout')->assertOk();
    }

    public function test_all_non_student_roles_can_login_and_use_shared_api_on_brave(): void
    {
        foreach (['staff', 'doctor', 'admin'] as $role) {
            $token = $this->brave()->postJson('/api/auth/login', $this->credentials($role))->assertOk()->json('token');
            $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/auth/me')->assertOk();
            $this->getJson('/api/terms')->assertOk();
            $this->getJson('/api/auth/session-context')->assertOk()->assertJsonPath('role', $role === 'admin' ? 'admin' : 'staff');
        }
        User::findOrFail('staff-1')->update(['role' => 'doctor']);
        $this->brave()->postJson('/api/auth/login', $this->credentials('doctor'))->assertOk();
    }

    public function test_unknown_and_non_brave_headers_are_not_classified_as_brave_and_switch_can_disable_policy(): void
    {
        $this->withHeader('User-Agent', 'TestUnknownBrowser')->postJson('/api/auth/login', $this->credentials())->assertOk();
        foreach (['Chrome/140 Safari/537.36', 'Edg/140 Chrome/140', 'Version/18 Safari/605.1'] as $ua) {
            $this->withHeader('User-Agent', $ua)->postJson('/api/auth/login', $this->credentials())->assertOk();
        }
        app(StudentLoginOptionsService::class)->update(['blockBraveForStudents' => false]);
        $this->brave()->postJson('/api/auth/login', $this->credentials())->assertOk();
        app(StudentLoginOptionsService::class)->update(['blockBraveForStudents' => true]);
        $this->withHeader('Sec-CH-UA', '"Chromium";v="140"')->withHeader('User-Agent', 'Mozilla/5.0 Brave/140')
            ->postJson('/api/auth/login', $this->credentials())->assertForbidden();
    }

    public function test_credential_probe_is_identity_only_and_does_not_trust_requested_role(): void
    {
        $this->postJson('/api/auth/credential-context', $this->credentials())->assertOk()->assertExactJson(['role' => 'student']);
        $this->assertDatabaseCount('api_tokens', 0);
        $this->assertDatabaseCount('student_device_bindings', 0);
        $this->postJson('/api/auth/credential-context', array_replace($this->credentials(), ['role' => 'admin']))->assertUnauthorized();
        $this->brave()->postJson('/api/auth/credential-context', $this->credentials())->assertForbidden();
    }

    public function test_refresh_is_blocked_before_cookie_rotation_and_context_uses_trusted_cookie_or_token_identity(): void
    {
        $login = $this->postJson('/api/auth/login', $this->credentials())->assertOk();
        $cookie = collect($login->headers->getCookies())->first(fn ($c) => $c->getName() === StudentRefreshSessionService::COOKIE_NAME);
        $before = StudentRefreshSession::first()->getAttributes();
        $count = ApiToken::count();
        $this->withCredentials()->withUnencryptedCookie(StudentRefreshSessionService::COOKIE_NAME, $cookie->getValue());
        $this->getJson('/api/auth/session-context')->assertOk()->assertExactJson(['role' => 'student']);
        $this->brave()->getJson('/api/auth/session-context')->assertForbidden();
        $this->withHeader('X-Requested-With', 'XMLHttpRequest')->postJson('/api/auth/refresh')->assertForbidden();
        $this->assertSame($before, StudentRefreshSession::first()->getAttributes());
        $this->assertSame($count, ApiToken::count());
        // A staff token takes precedence over a student cookie left by another account.
        $staff = $this->postJson('/api/auth/login', $this->credentials('staff'))->assertOk()->json('token');
        $this->withHeader('Authorization', 'Bearer '.$staff)->getJson('/api/auth/session-context')->assertOk()->assertExactJson(['role' => 'staff']);
    }

    public function test_admin_setting_is_central_and_older_settings_clients_preserve_it(): void
    {
        $admin = $this->postJson('/api/auth/login', $this->credentials('admin'))->assertOk()->json('token');
        $this->withHeader('Authorization', 'Bearer '.$admin)->putJson('/api/admin/settings/student-login-options', [
            'pwaEnabled' => true, 'webLoginEnabled' => true, 'blockBraveForStudents' => false,
        ])->assertOk()->assertJsonPath('data.blockBraveForStudents', false);
        $this->putJson('/api/admin/settings/student-login-options', ['pwaEnabled' => true, 'webLoginEnabled' => true])
            ->assertOk()->assertJsonPath('data.blockBraveForStudents', false);
        $this->brave()->getJson('/api/student-browser-policy')->assertOk()->assertExactJson(['enabled' => false, 'braveDetected' => true]);
    }
}
