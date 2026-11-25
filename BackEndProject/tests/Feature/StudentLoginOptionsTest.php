<?php

namespace Tests\Feature;

use Tests\TestCase;

class StudentLoginOptionsTest extends TestCase
{
    public function test_public_options_default_to_pwa_and_web_enabled(): void
    {
        $this->artisan('migrate:fresh --seed');

        $this->getJson('/api/student-login-options')
            ->assertOk()
            ->assertJsonPath('data.pwaEnabled', true)
            ->assertJsonPath('data.webLoginEnabled', true)
            ->assertJsonPath('data.privateBrowsingProtectionEnabled', true)
            ->assertJsonPath('data.deviceFingerprintProtectionEnabled', true)
            ->assertJsonPath('data.crossAccountDeviceProtectionEnabled', true)
            ->assertJsonPath('data.crossAccountFingerprintThreshold', 95);
    }

    public function test_admin_can_update_student_login_options(): void
    {
        $this->artisan('migrate:fresh --seed');
        $token = $this->adminToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/admin/settings/student-login-options', [
                'pwaEnabled' => false,
                'webLoginEnabled' => true,
                'privateBrowsingProtectionEnabled' => false,
                'deviceFingerprintProtectionEnabled' => false,
                'crossAccountDeviceProtectionEnabled' => false,
                'crossAccountFingerprintThreshold' => 80,
            ])
            ->assertOk()
            ->assertJsonPath('data.pwaEnabled', false)
            ->assertJsonPath('data.webLoginEnabled', true)
            ->assertJsonPath('data.privateBrowsingProtectionEnabled', false)
            ->assertJsonPath('data.deviceFingerprintProtectionEnabled', false)
            ->assertJsonPath('data.crossAccountDeviceProtectionEnabled', false)
            ->assertJsonPath('data.crossAccountFingerprintThreshold', 80);

        $this->getJson('/api/student-login-options')
            ->assertOk()
            ->assertJsonPath('data.pwaEnabled', false)
            ->assertJsonPath('data.webLoginEnabled', true)
            ->assertJsonPath('data.privateBrowsingProtectionEnabled', false)
            ->assertJsonPath('data.deviceFingerprintProtectionEnabled', false)
            ->assertJsonPath('data.crossAccountDeviceProtectionEnabled', false)
            ->assertJsonPath('data.crossAccountFingerprintThreshold', 80);
    }

    public function test_admin_cannot_disable_both_student_access_methods(): void
    {
        $this->artisan('migrate:fresh --seed');
        $token = $this->adminToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/admin/settings/student-login-options', [
                'pwaEnabled' => false,
                'webLoginEnabled' => false,
                'privateBrowsingProtectionEnabled' => true,
            ])
            ->assertUnprocessable();
    }

    public function test_older_admin_client_can_update_access_methods_without_overwriting_private_browsing_protection(): void
    {
        $this->artisan('migrate:fresh --seed');
        $token = $this->adminToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/admin/settings/student-login-options', [
                'pwaEnabled' => true,
                'webLoginEnabled' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.pwaEnabled', true)
            ->assertJsonPath('data.webLoginEnabled', false)
            ->assertJsonPath('data.privateBrowsingProtectionEnabled', true)
            ->assertJsonPath('data.deviceFingerprintProtectionEnabled', true)
            ->assertJsonPath('data.crossAccountDeviceProtectionEnabled', true)
            ->assertJsonPath('data.crossAccountFingerprintThreshold', 95);
    }

    public function test_student_cannot_update_student_login_options(): void
    {
        $this->artisan('migrate:fresh --seed');
        $token = $this->postJson('/api/auth/login', [
            'email' => 'student',
            'password' => '123',
            'role' => 'student',
            'deviceIdentifier' => 'settings-permission-device',
        ])->assertOk()->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/admin/settings/student-login-options', [
                'pwaEnabled' => true,
                'webLoginEnabled' => false,
                'privateBrowsingProtectionEnabled' => true,
            ])
            ->assertForbidden();
    }

    private function adminToken(): string
    {
        return $this->postJson('/api/auth/login', [
            'email' => 'a',
            'password' => '123',
            'role' => 'admin',
        ])->assertOk()->json('token');
    }
}
