<?php

namespace App\Services\Admin;

use App\Models\CourseAssignment;
use App\Models\User;
use Illuminate\Support\Str;

class StaffCourseService
{
    public function addCourse(User $staff, array $data): User
    {
        $termCode = \App\Models\AcademicTerm::getActiveTermCode();

        $staff->courses()->create([
            'uid' => $this->uniqueCourseUid($data['uid'] ?? "{$data['id']}-".Str::uuid(), $termCode),
            'course_id' => $data['id'],
            'name' => $data['name'],
            'faculty' => $data['faculty'] ?? null,
            'college' => $data['college'] ?? null,
            'type' => $data['type'] ?? null,
            'term_code' => $termCode,
        ]);

        return $this->loadCurrentTermRelations($staff, $termCode);
    }

    public function deleteCourse(User $staff, string $courseUid): User
    {
        $termCode = \App\Models\AcademicTerm::getActiveTermCode();

        CourseAssignment::query()
            ->where('user_id', $staff->id)
            ->where('uid', $courseUid)
            ->where('term_code', $termCode)
            ->delete();

        return $this->loadCurrentTermRelations($staff, $termCode);
    }

    private function loadCurrentTermRelations(User $staff, string $termCode): User
    {
        return $staff->fresh([
            'courses' => fn ($query) => $query->where('term_code', $termCode),
            'registrations' => fn ($query) => $query->where('term_code', $termCode),
        ]);
    }

    private function uniqueCourseUid(string $uid, string $termCode): string
    {
        $candidate = trim($uid) ?: (string) Str::uuid();

        if (! CourseAssignment::query()->whereKey($candidate)->exists()) {
            return $candidate;
        }

        $termSuffix = Str::slug($termCode) ?: 'term';
        $candidate = "{$candidate}-{$termSuffix}";
        $counter = 2;

        while (CourseAssignment::query()->whereKey($candidate)->exists()) {
            $candidate = "{$uid}-{$termSuffix}-{$counter}";
            $counter++;
        }

        return $candidate;
    }
}
