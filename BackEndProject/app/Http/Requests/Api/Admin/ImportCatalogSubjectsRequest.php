<?php

namespace App\Http\Requests\Api\Admin;

use App\Support\Permissions;
use Illuminate\Foundation\Http\FormRequest;

class ImportCatalogSubjectsRequest extends FormRequest
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
        $rules = [
            'facultyId' => ['nullable', 'string', 'max:255'],
            'termCode' => ['nullable', 'string', 'max:120'],
            'subjects' => ['required', 'array', 'min:1'],
            'subjects.*.subjectName' => ['required', 'string', 'max:255'],
            'subjects.*.subjectCode' => ['required', 'string', 'max:255'],
            'subjects.*.originalSubjectCode' => ['nullable', 'string', 'max:255'],
            'subjects.*.faculty' => ['nullable', 'string', 'max:255'],
            'subjects.*.groupCount' => ['required', 'integer', 'min:1', 'max:26'],
            'subjects.*.groupCounts' => ['nullable', 'array'],
            'subjects.*.groupCounts.Lecture' => ['nullable', 'integer', 'min:0', 'max:26'],
            'subjects.*.groupCounts.Section' => ['nullable', 'integer', 'min:0', 'max:26'],
            'subjects.*.groupCounts.Practical' => ['nullable', 'integer', 'min:0', 'max:26'],
            'subjects.*.types' => ['required', 'array', 'min:1'],
            'subjects.*.termCode' => ['nullable', 'string', 'max:120'],
        ];

        // Scope distinct to one subject; a double wildcard compares all subjects.
        $subjects = $this->input('subjects', []);
        foreach (is_array($subjects) ? $subjects : [] as $index => $subject) {
            $rules["subjects.{$index}.types.*"] = ['required', 'string', 'distinct', 'in:Lecture,Section,Practical'];
        }

        return $rules;
    }
}
