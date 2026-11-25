<?php

return [
    /*
    | A server-issued QR/code proof may be synchronized this many hours after
    | its original validity window ended. Browser timestamps are never used to
    | authorize queued attendance.
    */
    'offline_sync_max_hours' => max(0, (int) env('ATTENDANCE_OFFLINE_SYNC_MAX_HOURS', 24)),
];
