<?php

namespace App\Support;

use App\Models\SystemSetting;
use App\Models\User;

class AttendanceRosterOptions
{
    public static function current(): array
    {
        return array_replace([
            'enabled' => false,
            'allDoctors' => true,
            'doctorIds' => [],
            'dashboard' => true,
            'flexible' => true,
        ], SystemSetting::query()->find('attendance_roster_options')?->value ?? []);
    }

    public static function allowed(User $user, string $mode): bool
    {
        $options = self::current();

        return in_array($mode, ['dashboard', 'flexible'], true)
            && in_array($user->role, ['doctor', 'staff'], true)
            && $options['enabled'] && $options[$mode]
            && ($options['allDoctors'] || in_array($user->id, $options['doctorIds'], true));
    }
}
