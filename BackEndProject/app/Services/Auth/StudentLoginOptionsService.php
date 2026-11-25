<?php

namespace App\Services\Auth;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

class StudentLoginOptionsService
{
    public const SETTING_KEY = 'student_login_options';

    private const CACHE_KEY = 'student_login_options.current';

    private const DEFAULTS = [
        'blockBraveForStudents' => false,
        'pwaEnabled' => true,
        'webLoginEnabled' => true,
        'privateBrowsingProtectionEnabled' => true,
        'deviceFingerprintProtectionEnabled' => true,
        'crossAccountDeviceProtectionEnabled' => true,
        'crossAccountFingerprintThreshold' => 95,
        'sessionCodeLength' => 6,
    ];

    public function current(): array
    {
        return Cache::remember(self::CACHE_KEY, now()->addMinutes(5), function (): array {
            $stored = SystemSetting::query()->find(self::SETTING_KEY)?->value;

            return [
                'blockBraveForStudents' => (bool) ($stored['blockBraveForStudents'] ?? self::DEFAULTS['blockBraveForStudents']),
                'pwaEnabled' => (bool) ($stored['pwaEnabled'] ?? self::DEFAULTS['pwaEnabled']),
                'webLoginEnabled' => (bool) ($stored['webLoginEnabled'] ?? self::DEFAULTS['webLoginEnabled']),
                'privateBrowsingProtectionEnabled' => (bool) ($stored['privateBrowsingProtectionEnabled'] ?? self::DEFAULTS['privateBrowsingProtectionEnabled']),
                'deviceFingerprintProtectionEnabled' => (bool) ($stored['deviceFingerprintProtectionEnabled'] ?? self::DEFAULTS['deviceFingerprintProtectionEnabled']),
                'crossAccountDeviceProtectionEnabled' => (bool) ($stored['crossAccountDeviceProtectionEnabled'] ?? self::DEFAULTS['crossAccountDeviceProtectionEnabled']),
                'crossAccountFingerprintThreshold' => in_array((int) ($stored['crossAccountFingerprintThreshold'] ?? self::DEFAULTS['crossAccountFingerprintThreshold']), DeviceFingerprintService::CROSS_ACCOUNT_THRESHOLDS, true)
                    ? (int) ($stored['crossAccountFingerprintThreshold'] ?? self::DEFAULTS['crossAccountFingerprintThreshold'])
                    : self::DEFAULTS['crossAccountFingerprintThreshold'],
                'sessionCodeLength' => in_array((int) ($stored['sessionCodeLength'] ?? self::DEFAULTS['sessionCodeLength']), [4, 6], true)
                    ? (int) ($stored['sessionCodeLength'] ?? self::DEFAULTS['sessionCodeLength'])
                    : self::DEFAULTS['sessionCodeLength'],
            ];
        });
    }

    public function update(array $changes): array
    {
        $options = [...$this->current(), ...$changes];

        SystemSetting::query()->updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => $options],
        );

        Cache::forget(self::CACHE_KEY);

        return $this->current();
    }

    public function deviceFingerprintProtectionEnabled(): bool
    {
        return $this->current()['deviceFingerprintProtectionEnabled'];
    }

    public function crossAccountFingerprintThreshold(): float
    {
        return (float) $this->current()['crossAccountFingerprintThreshold'];
    }

    public function crossAccountDeviceProtectionEnabled(): bool
    {
        return $this->current()['crossAccountDeviceProtectionEnabled'];
    }
}
