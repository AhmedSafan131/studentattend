<?php

return [
    'log_slow_requests' => env('SLOW_API_LOG_ENABLED', true),
    'slow_request_ms' => max(0, (int) env('SLOW_API_THRESHOLD_MS', 2000)),
];
