<?php

namespace App\Http\Requests\Api\Admin;

use App\Support\Permissions;
use Illuminate\Foundation\Http\FormRequest;

class StoreStaffCourseRequest extends FormRequest
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

        return in_array(Permissions::MANAGE_DOCTORS, $permissions, true)
            || in_array(Permissions::FULL_DASHBOARD_ACCESS, $permissions, true);
    }

    public function rules(): array
    {
        return [
            'uid' => ['nullable', 'string', 'max:120'],
            'id' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'faculty' => ['nullable', 'string', 'max:255'],
            'college' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:255'],
        ];
    }
}
