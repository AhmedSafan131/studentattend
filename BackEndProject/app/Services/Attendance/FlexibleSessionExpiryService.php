<?php

namespace App\Services\Attendance;

use App\Models\AdHocAttendanceSession;
use App\Models\LectureSession;
use Illuminate\Support\Facades\DB;

class FlexibleSessionExpiryService
{
    public const LIFETIME_MINUTES = 10;

    public function expireIfDue(AdHocAttendanceSession $session): bool
    {
        if (! $this->isDue($session)) {
            return false;
        }

        $expired = $this->expireDueSessions($session->id) > 0;
        $session->refresh();

        return $expired;
    }

    public function expireDueSessions(?string $sessionId = null): int
    {
        $cutoff = now()->subMinutes(self::LIFETIME_MINUTES);

        return DB::transaction(function () use ($cutoff, $sessionId): int {
            $sessions = AdHocAttendanceSession::query()
                ->where('status', 'open')
                ->whereNotNull('started_at')
                ->where('started_at', '<=', $cutoff)
                ->when($sessionId, fn ($query) => $query->whereKey($sessionId))
                ->lockForUpdate()
                ->get(['id', 'linked_lecture_session_id']);

            if ($sessions->isEmpty()) {
                return 0;
            }

            $closedAt = now();
            $sessionIds = $sessions->pluck('id');
            $linkedSessionIds = $sessions->pluck('linked_lecture_session_id')->filter()->unique();

            $closedCount = AdHocAttendanceSession::query()
                ->whereIn('id', $sessionIds)
                ->where('status', 'open')
                ->where('started_at', '<=', $cutoff)
                ->update([
                    'status' => 'closed',
                    'ended_at' => $closedAt,
                    'qr_token' => null,
                    'qr_token_expires_at' => null,
                    'updated_at' => $closedAt,
                ]);

            if ($linkedSessionIds->isNotEmpty()) {
                LectureSession::query()
                    ->whereIn('id', $linkedSessionIds)
                    ->update([
                        'status' => 'ended',
                        'ended_at' => $closedAt,
                        'qr_token' => null,
                        'qr_token_expires_at' => null,
                        'updated_at' => $closedAt,
                    ]);
            }

            return $closedCount;
        });
    }

    private function isDue(AdHocAttendanceSession $session): bool
    {
        return $session->status === 'open'
            && $session->started_at !== null
            && $session->started_at->copy()->addMinutes(self::LIFETIME_MINUTES)->lessThanOrEqualTo(now());
    }
}
