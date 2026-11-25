<?php

namespace App\Support;

use App\Models\AdHocAttendanceSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class FlexibleAttendanceRegistration
{
    public static function required(AdHocAttendanceSession $session): bool
    {
        $session->loadMissing('owner');

        return (bool) $session->owner?->require_flexible_student_registration;
    }

    public static function apply(Builder $query, AdHocAttendanceSession $session): Builder
    {
        if (! self::required($session)) {
            return $query;
        }

        return $query->whereHas('registrations', function (Builder $registrations) use ($session) {
            self::applySessionScope($registrations, $session);
        });
    }

    public static function studentIsEligible(AdHocAttendanceSession $session, User $student): bool
    {
        if (! self::required($session)) {
            return true;
        }

        $registrations = $student->registrations();
        self::applySessionScope($registrations, $session);

        return $registrations->exists();
    }

    public static function applyRosterScope(Builder $query, AdHocAttendanceSession $session): Builder
    {
        $query->whereHas('registrations', function (Builder $registrations) use ($session) {
            self::applySessionScope($registrations, $session);
        });

        $faculty = UniversityCatalog::findFaculty($session->faculty);
        $facultyValues = $faculty
            ? collect([
                $faculty['id'] ?? null,
                $faculty['name_ar'] ?? null,
                $faculty['name_en'] ?? null,
                ...collect($faculty['colleges'] ?? [])->flatMap(fn (array $college) => [
                    $college['id'] ?? null,
                    $college['name_ar'] ?? null,
                    $college['name_en'] ?? null,
                    ...($college['aliases'] ?? []),
                ])->all(),
            ])
            : collect([$session->faculty]);

        $normalizedFacultyValues = $facultyValues
            ->filter()
            ->map(fn ($value) => mb_strtolower(trim((string) $value)))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($normalizedFacultyValues !== []) {
            $query->whereIn(DB::raw('LOWER(TRIM(college))'), $normalizedFacultyValues);
        }

        return $query;
    }

    public static function studentIsRosterEligible(AdHocAttendanceSession $session, User $student): bool
    {
        return self::applyRosterScope(
            User::query()->where('role', 'student')->whereKey($student->id),
            $session,
        )->exists();
    }

    private static function applySessionScope($query, AdHocAttendanceSession $session): void
    {
        $query->where('term_code', $session->term_code)
            ->whereRaw('UPPER(TRIM(subject_code)) = ?', [strtoupper(trim((string) $session->subject_code))]);

        if (trim((string) $session->lecture_type) !== '') {
            $query->whereRaw('LOWER(TRIM(type)) = ?', [strtolower(trim((string) $session->lecture_type))]);
        }
        if (! $session->allow_all_groups && trim((string) $session->group) !== '') {
            $query->whereRaw('LOWER(TRIM(`group`)) = ?', [strtolower(trim((string) $session->group))]);
        }
    }
}
