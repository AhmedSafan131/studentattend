<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogSlowApiRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('performance.log_slow_requests')) {
            return $next($request);
        }

        $started = hrtime(true);
        $databaseStarted = DB::connection()->totalQueryDuration();
        $status = 500;
        try {
            $response = $next($request);
            $status = $response->getStatusCode();
            return $response;
        } finally {
            $duration = (hrtime(true) - $started) / 1e6;
            if ($duration >= config('performance.slow_request_ms')) {
                // Route templates only: never log query parameters, tokens,
                // national IDs, request bodies, or SQL bindings.
                Log::warning('slow_api_request', [
                    'method' => $request->method(),
                    'route' => $request->route()?->uri() ?? 'unknown',
                    'status' => $status,
                    'duration_ms' => round($duration, 1),
                    'database_ms' => round(DB::connection()->totalQueryDuration() - $databaseStarted, 1),
                    'peak_memory_mb' => round(memory_get_peak_usage(true) / 1048576, 1),
                ]);
            }
        }
    }
}
