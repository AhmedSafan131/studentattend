<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization', '');
        $token = str_starts_with($header, 'Bearer ') ? substr($header, 7) : '';

        if ($token === '') {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $apiToken = ApiToken::query()
            ->with('user')
            ->where('token_hash', hash('sha256', $token))
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->first();

        if (! $apiToken || ! $apiToken->user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        app(\App\Services\Auth\StudentBrowserPolicy::class)->enforce($request, $apiToken->user);

        // Activity bookkeeping must not turn every poll/scan into a write.
        // Authentication and expiry are still checked on every request.
        $activityCutoff = now()->subMinute();
        if (! $apiToken->last_used_at || $apiToken->last_used_at->lt($activityCutoff)) {
            ApiToken::query()->whereKey($apiToken->id)
                ->where(fn ($query) => $query->whereNull('last_used_at')->orWhere('last_used_at', '<', $activityCutoff))
                ->update(['last_used_at' => now()]);
        }
        Auth::setUser($apiToken->user);
        $request->setUserResolver(fn () => $apiToken->user);
        $request->attributes->set('auth_api_token', $apiToken);

        return $next($request);
    }
}
