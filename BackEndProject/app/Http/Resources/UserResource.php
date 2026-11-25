<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'name' => $this->name ?: $this->full_name,
            'fullName' => $this->full_name,
            'role' => $this->role,
            'userRole' => $this->role,
            'specialty' => $this->specialty,
            'avatar' => $this->avatar,
            'isSystem' => (bool) $this->is_system,
            'permissions' => $this->permissions ?: [],
            'allowedColleges' => $this->allowed_colleges ?: [],
            'restrictFlexibleAttendanceToAssignments' => (bool) $this->restrict_flexible_attendance_to_assignments,
            'requireFlexibleStudentRegistration' => (bool) $this->require_flexible_student_registration,
            'courses' => $this->whenLoaded('courses', fn () => $this->courses->map(fn ($course) => [
                'uid' => $course->uid,
                'id' => $course->course_id,
                'name' => $course->name,
                'faculty' => $course->faculty,
                'college' => $course->college,
                'type' => $course->type,
                'termCode' => $course->term_code,
            ])->values(), []),
            'studentId' => $this->student_id,
            'universityId' => $this->university_id ?: $this->student_id,
            'nationalId' => $this->national_id,
            'college' => $this->college,
            'activationCount' => (int) $this->activation_count,
            'registrations' => $this->whenLoaded('registrations', fn () => $this->registrations->map(fn ($registration) => [
                'subjectCode' => $registration->subject_code,
                'subjectName' => $registration->subject_name,
                'group' => $registration->group,
                'type' => $registration->type,
                'termCode' => $registration->term_code,
            ])->values(), []),
        ];
    }
}
