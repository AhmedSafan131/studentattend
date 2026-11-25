<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Older profile edits could copy the student's new group onto historical
        // attendance rows. Restore every denormalized field from the session that
        // was actually opened so existing history is repaired as well as new data.
        DB::table('attendance_records as attendance')
            ->join('lecture_sessions as sessions', 'sessions.id', '=', 'attendance.lecture_session_id')
            ->select([
                'attendance.id',
                'sessions.course_code',
                'sessions.lecture_type',
                'sessions.group',
                'sessions.week',
                'sessions.term_code',
            ])
            ->orderBy('attendance.id')
            ->chunk(500, function ($records): void {
                foreach ($records as $record) {
                    DB::table('attendance_records')
                        ->where('id', $record->id)
                        ->update([
                            'course_code' => $record->course_code,
                            'lecture_type' => $record->lecture_type,
                            'group' => $record->group,
                            'week' => $record->week,
                            'term_code' => $record->term_code,
                        ]);
                }
            });
    }

    public function down(): void
    {
        // The previous inconsistent values cannot be reconstructed safely.
    }
};
