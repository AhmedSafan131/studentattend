<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    protected $fillable = [
        'lecture_session_id',
        'student_id',
        'scan_request_id',
        'course_code',
        'lecture_type',
        'group',
        'week',
        'scanned_at',
        'term_code',
    ];

    protected function casts(): array
    {
        return [
            'scanned_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // A session cannot be both present and absent. Keeping this invariant on
        // the canonical presence model covers QR, manual, and flexible imports.
        static::saved(function (AttendanceRecord $record): void {
            $session = $record->lectureSession()->first();
            $courseCode = $session?->course_code ?: $record->course_code;
            $lectureType = $session?->lecture_type ?: $record->lecture_type;
            $normalizedWeek = self::normalizeWeek($session?->week ?: $record->week);

            AdministrativeSubjectAbsence::query()
                ->where('student_id', $record->student_id)
                ->where('term_code', $record->term_code)
                ->whereRaw('UPPER(TRIM(subject_code)) = ?', [self::normalizeCode($courseCode)])
                ->whereRaw('UPPER(TRIM(lecture_type)) = ?', [self::normalizeCode($lectureType)])
                ->get()
                ->filter(fn (AdministrativeSubjectAbsence $absence) => (
                    self::normalizeWeek($absence->week) === $normalizedWeek
                ))
                ->each->delete();
        });
    }

    public function lectureSession(): BelongsTo
    {
        return $this->belongsTo(LectureSession::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    private static function normalizeCode(?string $value): string
    {
        return strtoupper(trim((string) $value));
    }

    private static function normalizeWeek(?string $value): string
    {
        preg_match('/\d+/', (string) $value, $matches);

        return isset($matches[0]) ? (string) ((int) $matches[0]) : self::normalizeCode($value);
    }
}
