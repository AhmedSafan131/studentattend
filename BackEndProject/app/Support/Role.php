<?php

namespace App\Support;

final class Role
{
    public static function normalize(?string $role): string
    {
        $role = strtolower(trim((string) $role));

        return match ($role) {
            'admin', 'student', 'staff' => $role,
            'doctor' => 'staff',
            default => 'staff',
        };
    }

    public static function isStaff(string $role): bool
    {
        return in_array(self::normalize($role), ['staff'], true);
    }
}
