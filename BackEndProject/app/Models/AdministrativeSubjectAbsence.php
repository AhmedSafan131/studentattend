<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdministrativeSubjectAbsence extends Model
{
    use HasUuids;

    protected $fillable = [
        'lecture_session_id', 'student_id', 'created_by', 'source', 'faculty_id',
        'subject_code', 'subject_name', 'lecture_type', 'group', 'week', 'term_code',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function lectureSession(): BelongsTo
    {
        return $this->belongsTo(LectureSession::class);
    }
}
