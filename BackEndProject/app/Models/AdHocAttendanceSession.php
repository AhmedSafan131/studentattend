<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdHocAttendanceSession extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'subject_name',
        'subject_code',
        'faculty',
        'lecture_type',
        'group',
        'allow_all_groups',
        'week',
        'qr_window_seconds',
        'qr_token',
        'qr_token_expires_at',
        'linked_lecture_session_id',
        'status',
        'started_at',
        'ended_at',
        'migrated_at',
        'migrated_to_course_code',
        'migrated_to_lecture_type',
        'migrated_to_group',
        'migrated_to_week',
        'migrated_to_faculty',
        'migrated_by',
        'term_code',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'migrated_at' => 'datetime',
            'qr_window_seconds' => 'integer',
            'allow_all_groups' => 'boolean',
            'qr_token_expires_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function migratedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'migrated_by');
    }

    public function records(): HasMany
    {
        return $this->hasMany(AdHocAttendanceRecord::class);
    }

    public function linkedLectureSession(): BelongsTo
    {
        return $this->belongsTo(LectureSession::class, 'linked_lecture_session_id');
    }
}
