<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LectureSession extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'course_code',
        'lecture_type',
        'group',
        'week',
        'allow_all_groups',
        'status',
        'qr_token',
        'qr_token_expires_at',
        'started_at',
        'ended_at',
        'term_code',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'qr_token_expires_at' => 'datetime',
            'allow_all_groups' => 'boolean',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function absenceRecords(): HasMany
    {
        return $this->hasMany(AdministrativeSubjectAbsence::class);
    }
}
