<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentRefreshSession extends Model
{
    protected $fillable = [
        'user_id',
        'student_device_binding_id',
        'family_id',
        'token_hash',
        'replaced_by_id',
        'last_used_at',
        'expires_at',
        'absolute_expires_at',
        'revoked_at',
        'revoked_reason',
        'ip_address',
        'user_agent',
    ];

    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
            'absolute_expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function deviceBinding(): BelongsTo
    {
        return $this->belongsTo(StudentDeviceBinding::class, 'student_device_binding_id');
    }

    public function replacement(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaced_by_id');
    }
}
