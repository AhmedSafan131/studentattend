<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CatalogSubjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $groupCount = max(1, min(26, (int) ($this->group_count ?: 1)));
        $groupCounts = collect(['Lecture', 'Section', 'Practical'])->mapWithKeys(fn (string $type) => [
            $type => max(0, min(26, (int) (($this->group_counts[$type] ?? null) ?? (in_array($type, $this->types ?: ['Lecture'], true) ? $groupCount : 0)))),
        ])->all();

        return [
            'id' => $this->id,
            'facultyId' => $this->faculty_id,
            'facultyName' => $this->faculty_name,
            'subjectCode' => $this->subject_code,
            'subjectName' => $this->subject_name,
            'groupCount' => $groupCount,
            'groupCounts' => $groupCounts,
            'groupsByType' => collect($groupCounts)->map(fn (int $count) => $count > 0
                ? collect(range(0, $count - 1))->map(fn (int $index) => chr(65 + $index))->all()
                : [])->all(),
            'groups' => collect(range(0, $groupCount - 1))
                ->map(fn (int $index) => chr(65 + $index))
                ->all(),
            'types' => $this->types ?: ['Lecture'],
            'termCode' => $this->term_code,
        ];
    }
}
