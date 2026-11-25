<?php

return [
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:3000',
        'https://localhost:3443',
        'http://10.1.43.98:3000',
    ],

    'allowed_origins_patterns' => [
        '/^http:\/\/10\.\d+\.\d+\.\d+:3000$/',
        '/^https:\/\/10\.\d+\.\d+\.\d+:3443$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
