<?php

namespace App\Http\Requests\Api\Admin;

use App\Support\Permissions;
use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        if ($user->is_system || $user->role === 'admin') {
            return true;
        }

        $permissions = $user->permissions ?: [];
        $targetRole = (string) ($this->input('userRole') ?: $this->input('role') ?: 'staff');
        $requiredPermission = $targetRole === 'admin'
            ? Permissions::MANAGE_ADMINS
            : Permissions::MANAGE_DOCTORS;

        return in_array($requiredPermission, $permissions, true)
            || in_array(Permissions::FULL_DASHBOARD_ACCESS, $permissions, true);
    }

    public function rules(): array
    {
        return [
            'id' => ['nullable', 'string', 'max:120'],
            'email' => ['required', 'string', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:255'],
            'fullName' => ['nullable', 'string', 'max:255'],
            'full_name' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string'],
            'userRole' => ['nullable', 'string'],
            'specialty' => ['nullable', 'string', 'max:255'],
            'avatar' => ['nullable', 'string', 'max:20'],
            'isSystem' => ['nullable', 'boolean'],
            'permissions' => ['nullable', 'array'],
            'allowedColleges' => ['nullable', 'array'],
            'restrictFlexibleAttendanceToAssignments' => ['nullable', 'boolean'],
            'requireFlexibleStudentRegistration' => ['nullable', 'boolean'],
            'courses' => ['nullable', 'array'],
            'studentId' => ['nullable', 'string', 'max:255'],
            'universityId' => ['nullable', 'string', 'max:255'],
            'nationalId' => ['nullable', 'string', 'max:255'],
            'college' => ['nullable', 'string', 'max:255'],
            'registrations' => ['nullable', 'array'],
        ];
    }
}
