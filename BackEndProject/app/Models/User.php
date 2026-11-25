<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'id',
        'name',
        'full_name',
        'email',
        'password',
        'role',
        'specialty',
        'avatar',
        'is_system',
        'permissions',
        'allowed_colleges',
        'restrict_flexible_attendance_to_assignments',
        'require_flexible_student_registration',
        'student_id',
        'university_id',
        'national_id',
        'college',
        'activation_count',
        'temporary_login_code_hash',
        'temporary_login_code_digest',
        'temporary_login_code_expires_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'temporary_login_code_hash',
        'temporary_login_code_digest',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_system' => 'boolean',
            'permissions' => 'array',
            'allowed_colleges' => 'array',
            'restrict_flexible_attendance_to_assignments' => 'boolean',
            'require_flexible_student_registration' => 'boolean',
            'activation_count' => 'integer',
            'temporary_login_code_expires_at' => 'datetime',
        ];
    }

    public function courses(): HasMany
    {
        return $this->hasMany(CourseAssignment::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(StudentRegistration::class);
    }

    public function lectureSessions(): HasMany
    {
        return $this->hasMany(LectureSession::class);
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class, 'student_id');
    }

    public function apiTokens(): HasMany
    {
        return $this->hasMany(ApiToken::class);
    }

    public function deviceBinding(): HasOne
    {
        return $this->hasOne(StudentDeviceBinding::class);
    }

    public function refreshSessions(): HasMany
    {
        return $this->hasMany(StudentRefreshSession::class);
    }
}
