<?php

namespace App\Services;

use Illuminate\Http\Request;

class LocaleService
{
    public function resolve(Request $request): string
    {
        $language = $request->input('language')
            ?: $request->header('Accept-Language')
            ?: config('app.locale', 'en');

        return str_starts_with(strtolower($language), 'ar') ? 'ar' : 'en';
    }

    public function message(string $key, Request $request): string
    {
        return trans("messages.$key", [], $this->resolve($request));
    }
}
