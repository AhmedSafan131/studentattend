<?php

namespace App\Http\Requests\Api\Admin;

use App\Support\Permissions;
use Illuminate\Foundation\Http\FormRequest;

class SaveCatalogSubjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        return $user->is_system
            || $user->role === 'admin'
            || in_array(Permissions::MANAGE_SUBJECT_CATALOG, $user->permissions ?: [], true)
            || in_array(Permissions::FULL_DASHBOARD_ACCESS, $user->permissions ?: [], true);
    }

    public function rules(): array
    {
        return [
            'facultyId' => ['required', 'string', 'max:120'],
            'subjectName' => ['required', 'string', 'max:255'],
            'subjectCode' => ['required', 'string', 'max:120'],
            'groupCount' => ['required', 'integer', 'min:1', 'max:26'],
            'groupCounts' => ['nullable', 'array'],
            'groupCounts.Lecture' => ['nullable', 'integer', 'min:0', 'max:26'],
            'groupCounts.Section' => ['nullable', 'integer', 'min:0', 'max:26'],
            'groupCounts.Practical' => ['nullable', 'integer', 'min:0', 'max:26'],
            'types' => ['required', 'array', 'min:1'],
            'types.*' => ['required', 'string', 'distinct', 'in:Lecture,Section,Practical'],
            'termCode' => ['nullable', 'string', 'max:120'],
        ];
    }
}
