<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Auth\StudentLoginOptionsService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentLoginOptionsController extends Controller
{
    public function __construct(private readonly StudentLoginOptionsService $options) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->options->current()]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeManagement($request);

        $data = $request->validate([
            'blockBraveForStudents' => ['sometimes', 'boolean'],
            'pwaEnabled' => ['required', 'boolean'],
            'webLoginEnabled' => ['required', 'boolean'],
            'privateBrowsingProtectionEnabled' => ['sometimes', 'boolean'],
            'deviceFingerprintProtectionEnabled' => ['sometimes', 'boolean'],
            'crossAccountDeviceProtectionEnabled' => ['sometimes', 'boolean'],
            'crossAccountFingerprintThreshold' => ['sometimes', 'integer', 'in:80,95'],
            'sessionCodeLength' => ['sometimes', 'integer', 'in:4,6'],
        ]);

        if (! $data['pwaEnabled'] && ! $data['webLoginEnabled']) {
            return response()->json([
                'message' => 'At least one student access method must remain enabled.',
                'errors' => [
                    'studentAccess' => ['At least one student access method must remain enabled.'],
                ],
            ], 422);
        }

        $currentOptions = $this->options->current();
        $options = $this->options->update([
            'blockBraveForStudents' => (bool) ($data['blockBraveForStudents'] ?? $currentOptions['blockBraveForStudents'] ?? false),
            'pwaEnabled' => (bool) $data['pwaEnabled'],
            'webLoginEnabled' => (bool) $data['webLoginEnabled'],
            'privateBrowsingProtectionEnabled' => (bool) ($data['privateBrowsingProtectionEnabled']
                ?? $currentOptions['privateBrowsingProtectionEnabled']),
            'deviceFingerprintProtectionEnabled' => (bool) ($data['deviceFingerprintProtectionEnabled']
                ?? $currentOptions['deviceFingerprintProtectionEnabled']),
            'crossAccountDeviceProtectionEnabled' => (bool) ($data['crossAccountDeviceProtectionEnabled']
                ?? $currentOptions['crossAccountDeviceProtectionEnabled']),
            'crossAccountFingerprintThreshold' => (int) ($data['crossAccountFingerprintThreshold']
                ?? $currentOptions['crossAccountFingerprintThreshold']),
            'sessionCodeLength' => (int) ($data['sessionCodeLength'] ?? $currentOptions['sessionCodeLength']),
        ]);
        \Illuminate\Support\Facades\Cache::forget('attendance_session_code_length');

        return response()->json([
            'message' => 'Student access settings updated successfully.',
            'data' => $options,
        ]);
    }

    private function authorizeManagement(Request $request): void
    {
        $user = $request->user();
        abort_unless($user && $user->role === 'admin', 403);

        $permissions = $user->permissions ?: [];
        abort_unless(
            $user->is_system
            || in_array(Permissions::MANAGE_PERMISSIONS, $permissions, true)
            || in_array(Permissions::FULL_DASHBOARD_ACCESS, $permissions, true),
            403,
        );
    }
}
