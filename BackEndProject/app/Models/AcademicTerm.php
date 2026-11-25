<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcademicTerm extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'academic_year',
        'start_date',
        'end_date',
        'weeks_count',
        'is_active',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'weeks_count' => 'integer',
        'is_active' => 'boolean',
    ];

    public static function getActiveTermCode(): string
    {
        return static::query()->where('is_active', true)->value('code')
            ?: static::query()->orderBy('id')->value('code')
            ?: 'SUMMER-2025-2026';
    }

    public static function getActiveTerm(): ?static
    {
        return static::query()->where('is_active', true)->first()
            ?: static::query()->orderBy('id')->first();
    }
}
