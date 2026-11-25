<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            $flexibleLectureIds = DB::table('ad_hoc_attendance_sessions')
                ->where('status', '!=', 'migrated')
                ->whereNotNull('linked_lecture_session_id')
                ->pluck('linked_lecture_session_id')
                ->all();

            $sessions = DB::table('lecture_sessions')
                ->when($flexibleLectureIds, fn ($query) => $query->whereNotIn('id', $flexibleLectureIds))
                ->orderBy('started_at')
                ->orderBy('created_at')
                ->get();

            $groups = $sessions->groupBy(fn ($session) => implode('|', [
                $session->user_id,
                strtoupper(trim((string) $session->term_code)),
                strtoupper(trim((string) $session->course_code)),
                strtoupper(trim((string) $session->lecture_type)),
                strtoupper(trim((string) $session->group)),
                $this->normalizeWeek((string) $session->week),
            ]));

            foreach ($groups as $duplicates) {
                if ($duplicates->count() < 2) {
                    continue;
                }

                $canonical = $duplicates->first();
                $activeSession = $duplicates->firstWhere('status', 'active');
                foreach ($duplicates->slice(1) as $duplicate) {
                    $records = DB::table('attendance_records')
                        ->where('lecture_session_id', $duplicate->id)
                        ->get();

                    foreach ($records as $record) {
                        $alreadyPresent = DB::table('attendance_records')
                            ->where('lecture_session_id', $canonical->id)
                            ->where('student_id', $record->student_id)
                            ->exists();

                        if ($alreadyPresent) {
                            DB::table('attendance_records')->where('id', $record->id)->delete();
                        } else {
                            DB::table('attendance_records')->where('id', $record->id)->update([
                                'lecture_session_id' => $canonical->id,
                            ]);
                        }
                    }

                    DB::table('ad_hoc_attendance_sessions')
                        ->where('linked_lecture_session_id', $duplicate->id)
                        ->update(['linked_lecture_session_id' => $canonical->id]);
                    DB::table('lecture_sessions')->where('id', $duplicate->id)->delete();
                }

                $canonicalUpdates = [
                    'course_code' => strtoupper(trim((string) $canonical->course_code)),
                    'lecture_type' => trim((string) $canonical->lecture_type),
                    'group' => strtoupper(trim((string) $canonical->group)),
                    'week' => $this->normalizeWeek((string) $canonical->week),
                    'updated_at' => now(),
                ];

                if ($activeSession) {
                    $canonicalUpdates = array_merge($canonicalUpdates, [
                        'status' => 'active',
                        'ended_at' => null,
                        'qr_token' => $activeSession->qr_token,
                        'qr_token_expires_at' => $activeSession->qr_token_expires_at,
                    ]);
                }

                DB::table('lecture_sessions')->where('id', $canonical->id)->update($canonicalUpdates);
            }
        });
    }

    public function down(): void
    {
        // Merged attendance data cannot be separated safely again.
    }

    private function normalizeWeek(string $value): string
    {
        preg_match('/\d+/', $value, $matches);

        return isset($matches[0]) ? (string) ((int) $matches[0]) : strtoupper(trim($value));
    }
};
