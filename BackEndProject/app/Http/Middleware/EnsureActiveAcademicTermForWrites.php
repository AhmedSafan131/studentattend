<?php

namespace App\Http\Middleware;

use App\Models\AcademicTerm;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAcademicTermForWrites
{
    public function handle(Request $request, Closure $next): Response
    {
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $next($request);
        }

        // Term administration is global. Every other write must stay in the active term.
        if ($request->is('api/admin/terms*')) {
            return $next($request);
        }

        $requestedTermCode = trim((string) (
            $request->header('X-Academic-Term')
            ?: $request->query('term_code')
            ?: $request->query('termCode')
        ));

        if ($requestedTermCode === '') {
            return $next($request);
        }

        $activeTermCode = AcademicTerm::getActiveTermCode();

        if (strcasecmp($requestedTermCode, $activeTermCode) !== 0) {
            return response()->json([
                'message' => 'You are viewing a historical academic term. Switch to the active term before making changes.',
            ], 409);
        }

        return $next($request);
    }
}
