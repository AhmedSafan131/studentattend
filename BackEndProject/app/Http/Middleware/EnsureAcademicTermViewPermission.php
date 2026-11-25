<?php

namespace App\Http\Middleware;

use App\Models\AcademicTerm;
use App\Support\Permissions;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAcademicTermViewPermission
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->method(), ['GET', 'HEAD'], true)) {
            return $next($request);
        }

        $requestedTermCode = trim((string) (
            $request->header('X-Academic-Term')
            ?: $request->query('term_code')
            ?: $request->query('termCode')
        ));

        if ($requestedTermCode === '' || strcasecmp($requestedTermCode, AcademicTerm::getActiveTermCode()) === 0) {
            return $next($request);
        }

        $user = $request->user();
        $permissions = $user?->permissions ?: [];
        $isStudentHistoricalView = $user?->role === 'student'
            && $request->is('api/terms', 'api/auth/me', 'api/attendance/my');
        $canViewHistoricalTerms = $user
            && ($user->is_system
                || $user->role === 'admin'
                || $isStudentHistoricalView
                || in_array(Permissions::SELECT_ACADEMIC_TERM, $permissions, true));

        if ($canViewHistoricalTerms) {
            return $next($request);
        }

        return response()->json([
            'message' => 'You do not have permission to view a different academic term.',
        ], 403);
    }
}
