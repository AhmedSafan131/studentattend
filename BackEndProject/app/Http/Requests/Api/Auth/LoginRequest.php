<?php

namespace App\Http\Requests\Api\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
            'role' => ['required', 'string'],
            'deviceIdentifier' => ['nullable', 'string'],
            'deviceName' => ['nullable', 'string'],
            'platform' => ['nullable', 'string'],
            'browser' => ['nullable', 'string'],
            'deviceFingerprint' => ['nullable', 'array:version,platform,model,architecture,bitness,screenResolution,pixelRatio,hardwareConcurrency,deviceMemory,maxTouchPoints,colorDepth,webglVendor,webglRenderer'],
            'deviceFingerprint.version' => ['nullable', 'integer', 'min:1', 'max:10'],
            'deviceFingerprint.platform' => ['nullable', 'string', 'max:80'],
            'deviceFingerprint.model' => ['nullable', 'string', 'max:160'],
            'deviceFingerprint.architecture' => ['nullable', 'string', 'max:80'],
            'deviceFingerprint.bitness' => ['nullable', 'string', 'max:20'],
            'deviceFingerprint.screenResolution' => ['nullable', 'string', 'max:40'],
            'deviceFingerprint.pixelRatio' => ['nullable', 'numeric', 'min:0.1', 'max:20'],
            'deviceFingerprint.hardwareConcurrency' => ['nullable', 'integer', 'min:1', 'max:1024'],
            'deviceFingerprint.deviceMemory' => ['nullable', 'numeric', 'min:0.1', 'max:1024'],
            'deviceFingerprint.maxTouchPoints' => ['nullable', 'integer', 'min:0', 'max:100'],
            'deviceFingerprint.colorDepth' => ['nullable', 'integer', 'min:1', 'max:128'],
            'deviceFingerprint.webglVendor' => ['nullable', 'string', 'max:255'],
            'deviceFingerprint.webglRenderer' => ['nullable', 'string', 'max:500'],
        ];
    }
}
