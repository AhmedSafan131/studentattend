<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Auth\StudentLoginOptionsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StudentDeviceLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_same_device_cannot_be_used_by_another_student(): void
    {
        $firstStudent = $this->createStudent('student-one', '20260001');
        $secondStudent = $this->createStudent('student-two', '20260002');

        $this->login($firstStudent, 'shared-device')->assertOk();
        $this->login($secondStudent, 'shared-device')
            ->assertUnauthorized()
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('student_device_bindings', [
            'user_id' => $firstStudent->id,
            'device_identifier' => 'shared-device',
        ]);
    }

    public function test_student_account_remains_locked_to_its_first_device(): void
    {
        $student = $this->createStudent('student-one', '20260001');

        $this->login($student, 'first-device')->assertOk();
        $this->login($student, 'second-device')
            ->assertUnauthorized()
            ->assertJsonPath('success', false);
    }

    public function test_changed_uuid_is_accepted_when_device_fingerprint_is_at_least_eighty_percent_similar(): void
    {
        $student = $this->createStudent('student-similar', '20260003');
        $fingerprint = $this->fingerprint();

        $this->login($student, 'original-uuid', $fingerprint)->assertOk();

        $similarFingerprint = [
            ...$fingerprint,
            // A display color-depth change accounts for only 3% of the
            // comparable evidence, so the physical-device recovery is allowed.
            'colorDepth' => 30,
        ];

        $this->login($student, 'replacement-uuid', $similarFingerprint)->assertOk();

        $this->assertDatabaseHas('student_device_bindings', [
            'user_id' => $student->id,
            'device_identifier' => 'replacement-uuid',
        ]);
    }

    public function test_exactly_eighty_percent_similarity_is_accepted(): void
    {
        $student = $this->createStudent('student-boundary', '20260005');

        $this->login($student, 'original-uuid', $this->fingerprint())->assertOk();

        // Model has a weight of 20 out of 100, making this boundary exactly 80%.
        $this->login($student, 'replacement-uuid', $this->fingerprint([
            'model' => 'Updated Client Hint Model',
        ]))->assertOk();

        $this->assertDatabaseHas('student_device_bindings', [
            'user_id' => $student->id,
            'device_identifier' => 'replacement-uuid',
        ]);
    }

    public function test_changed_uuid_remains_locked_when_device_fingerprint_is_below_eighty_percent_similar(): void
    {
        $student = $this->createStudent('student-different', '20260004');

        $this->login($student, 'original-uuid', $this->fingerprint())->assertOk();

        $differentFingerprint = $this->fingerprint([
            'model' => 'Another Phone',
            'platform' => 'ios',
            'screenResolution' => '430x932',
            'webglRenderer' => 'Apple GPU',
        ]);

        $this->login($student, 'replacement-uuid', $differentFingerprint)
            ->assertUnauthorized()
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('student_device_bindings', [
            'user_id' => $student->id,
            'device_identifier' => 'original-uuid',
        ]);
    }

    public function test_device_protection_can_be_disabled_for_shared_devices_and_multiple_accounts(): void
    {
        $firstStudent = $this->createStudent('student-unrestricted-one', '20260006');
        $secondStudent = $this->createStudent('student-unrestricted-two', '20260007');
        app(StudentLoginOptionsService::class)->update([
            'deviceFingerprintProtectionEnabled' => false,
        ]);

        $this->login($firstStudent, 'shared-unrestricted-device', $this->fingerprint())->assertOk();
        $this->login($secondStudent, 'shared-unrestricted-device', $this->fingerprint())->assertOk();
        $this->login($firstStudent, 'another-unrestricted-device', $this->fingerprint([
            'model' => 'Another Phone',
        ]))->assertOk();

        $this->assertDatabaseCount('student_device_bindings', 2);
        $this->assertDatabaseHas('student_device_bindings', ['user_id' => $firstStudent->id]);
        $this->assertDatabaseHas('student_device_bindings', ['user_id' => $secondStudent->id]);
    }

    public function test_cross_account_device_protection_can_be_disabled_without_unlocking_each_account_from_its_device(): void
    {
        $firstStudent = $this->createStudent('student-shared-one', '20260016');
        $secondStudent = $this->createStudent('student-shared-two', '20260017');
        app(StudentLoginOptionsService::class)->update([
            'crossAccountDeviceProtectionEnabled' => false,
        ]);

        $this->login($firstStudent, 'family-device', $this->fingerprint())->assertOk();
        $this->login($secondStudent, 'family-device', $this->fingerprint())->assertOk();

        $this->login($firstStudent, 'different-device', $this->fingerprint([
            'model' => 'Different Phone',
            'platform' => 'ios',
            'screenResolution' => '430x932',
            'webglRenderer' => 'Apple GPU',
        ]))
            ->assertUnauthorized()
            ->assertJsonPath('message', __('messages.auth.login.account_locked'));

        $this->assertDatabaseCount('student_device_bindings', 2);
    }

    public function test_device_protection_defaults_to_enabled_when_setting_is_absent(): void
    {
        $firstStudent = $this->createStudent('student-default-one', '20260008');
        $secondStudent = $this->createStudent('student-default-two', '20260009');

        $this->login($firstStudent, 'default-protected-device', $this->fingerprint())->assertOk();
        $this->login($secondStudent, 'default-protected-device', $this->fingerprint())
            ->assertUnauthorized()
            ->assertJsonPath('success', false);

        $this->assertDatabaseMissing('student_device_bindings', [
            'user_id' => $secondStudent->id,
        ]);
    }

    public function test_same_physical_fingerprint_is_blocked_across_different_browser_uuids(): void
    {
        $firstStudent = $this->createStudent('student-browser-one', '20260010');
        $secondStudent = $this->createStudent('student-browser-two', '20260011');
        $fingerprint = $this->fingerprint();

        $this->login($firstStudent, 'chrome-browser-uuid', $fingerprint)->assertOk();
        $this->login($secondStudent, 'private-browser-uuid', $fingerprint)
            ->assertUnauthorized()
            ->assertJsonPath('success', false);

        $this->assertDatabaseMissing('student_device_bindings', [
            'user_id' => $secondStudent->id,
        ]);
    }

    public function test_ninety_five_percent_cross_account_threshold_does_not_block_an_eighty_percent_match(): void
    {
        $firstStudent = $this->createStudent('student-strict-one', '20260012');
        $secondStudent = $this->createStudent('student-strict-two', '20260013');

        $this->login($firstStudent, 'strict-first-uuid', $this->fingerprint())->assertOk();
        $this->login($secondStudent, 'strict-second-uuid', $this->fingerprint([
            'model' => 'Different Phone Model',
        ]))->assertOk();

        $this->assertDatabaseHas('student_device_bindings', [
            'user_id' => $secondStudent->id,
        ]);
    }

    public function test_eighty_percent_cross_account_threshold_blocks_an_eighty_percent_match(): void
    {
        $firstStudent = $this->createStudent('student-balanced-one', '20260014');
        $secondStudent = $this->createStudent('student-balanced-two', '20260015');
        app(StudentLoginOptionsService::class)->update([
            'crossAccountFingerprintThreshold' => 80,
        ]);

        $this->login($firstStudent, 'balanced-first-uuid', $this->fingerprint())->assertOk();
        $this->login($secondStudent, 'balanced-second-uuid', $this->fingerprint([
            'model' => 'Different Phone Model',
        ]))
            ->assertUnauthorized()
            ->assertJsonPath('success', false);

        $this->assertDatabaseMissing('student_device_bindings', [
            'user_id' => $secondStudent->id,
        ]);
    }

    private function createStudent(string $id, string $studentId): User
    {
        return User::query()->create([
            'id' => $id,
            'name' => $id,
            'full_name' => $id,
            'email' => "{$id}@student.local",
            'password' => Hash::make('password'),
            'role' => 'student',
            'student_id' => $studentId,
            'university_id' => $studentId,
        ]);
    }

    private function login(User $student, string $deviceIdentifier, ?array $deviceFingerprint = null)
    {
        return $this->postJson('/api/auth/login', [
            'email' => $student->student_id,
            'password' => 'password',
            'role' => 'student',
            'deviceIdentifier' => $deviceIdentifier,
            'deviceFingerprint' => $deviceFingerprint,
        ]);
    }

    private function fingerprint(array $overrides = []): array
    {
        return [
            ...[
                'version' => 1,
                'platform' => 'android',
                'model' => 'Example Phone',
                'architecture' => 'arm',
                'bitness' => '64',
                'screenResolution' => '412x915',
                'pixelRatio' => 2.63,
                'hardwareConcurrency' => 8,
                'deviceMemory' => 8,
                'maxTouchPoints' => 5,
                'colorDepth' => 24,
                'webglVendor' => 'Qualcomm',
                'webglRenderer' => 'Adreno 740',
            ],
            ...$overrides,
        ];
    }
}
