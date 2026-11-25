<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;

class StudentBrowserPolicy
{
    public const ERROR_CODE = 'STUDENT_BROWSER_BLOCKED';

    public const MESSAGE = 'تم حظر هذا المتصفح. برجاء الدخول باستخدام Shortcut أو Google Chrome أو Safari. شكرًا لتفهمكم. إدارة تكنولوجيا المعلومات بجامعة المنوفية الأهلية.';

    public function enabled(): bool
    {
        return (bool) (app(StudentLoginOptionsService::class)->current()['blockBraveForStudents'] ?? false);
    }

    public function detected(Request $request): bool
    {
        // Positive detection only. Missing/spoofed hints do not prove a browser is allowed.
        // Never accept an isBrave=false header, cookie or JS attestation as permission.
        return preg_match('/"Brave"\s*;/i', $request->header('Sec-CH-UA', '')) === 1
            || preg_match('/\bBrave(?:\/|\b)/i', $request->userAgent() ?? '') === 1;
    }

    public function enforce(Request $request, User $identity): void
    {
        if ($identity->role === 'student' && $this->enabled() && $this->detected($request)) {
            throw new HttpResponseException(response()->json([
                'message' => self::MESSAGE, 'errorCode' => self::ERROR_CODE,
            ], 403)->header('Cache-Control', 'no-store'));
        }
    }
}
