<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CatalogSubject extends Model
{
    protected $fillable = [
        'faculty_id',
        'faculty_name',
        'subject_code',
        'subject_name',
        'group_count',
        'group_counts',
        'types',
        'term_code',
    ];

    protected function casts(): array
    {
        return [
            'group_count' => 'integer',
            'group_counts' => 'array',
            'types' => 'array',
        ];
    }
}
