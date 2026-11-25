<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);
        $middleware->api(prepend: [\App\Http\Middleware\LogSlowApiRequests::class]);

        $middleware->alias([
            'auth.token' => \App\Http\Middleware\AuthenticateApiToken::class,
            'term.view' => \App\Http\Middleware\EnsureAcademicTermViewPermission::class,
            'term.active-for-writes' => \App\Http\Middleware\EnsureActiveAcademicTermForWrites::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
