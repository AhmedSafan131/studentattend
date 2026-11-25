<?php

namespace App\Http\Requests\Api\Student;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'id' => ['nullable', 'string', 'max:120'],
            'name' => ['required', 'string', 'max:255'],
            'fullName' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string'],
            'studentId' => ['nullable', 'required_without:nationalId', 'string', 'max:255'],
            'universityId' => ['nullable', 'string', 'max:255'],
            'nationalId' => ['nullable', 'required_without:studentId', 'string', 'max:255'],
            'college' => ['required', 'string', 'max:255'],
            'registrations' => ['nullable', 'array'],
            'registrations.*.subjectCode' => ['required', 'string', 'max:255'],
            'registrations.*.subjectName' => ['nullable', 'string', 'max:255'],
            'registrations.*.group' => ['required', 'string', 'max:255'],
            'registrations.*.type' => ['required', 'string', 'max:255'],
        ];
    }
}
