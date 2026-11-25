<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentDeviceBinding extends Model
{
    protected $fillable = [
        'user_id',
        'email',
        'device_identifier',
        'device_name',
        'platform',
        'browser',
        'device_fingerprint',
        'fingerprint_model_key',
        'fingerprint_screen_key',
        'fingerprint_graphics_key',
        'term_code',
    ];

    protected function casts(): array
    {
        return [
            'device_fingerprint' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function refreshSessions(): HasMany
    {
        return $this->hasMany(StudentRefreshSession::class);
    }
}
