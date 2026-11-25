<?php

namespace App\Services\Catalog;

use App\Models\CatalogSubject;
use App\Support\UniversityCatalog;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CatalogSubjectService
{
    private const ALLOWED_TYPES = ['Lecture', 'Section', 'Practical'];

    public function list(?string $facultyId = null, ?string $termCode = null): Collection
    {
        $query = CatalogSubject::query()->orderBy('faculty_name')->orderBy('subject_code');

        if ($facultyId) {
            $query->where('faculty_id', $facultyId);
        }

        if ($termCode && $termCode !== 'all') {
            $query->where(function ($q) use ($termCode) {
                $q->where('term_code', $termCode)->orWhereNull('term_code');
            });
        }

        return $query->get();
    }

    public function import(array $subjects, ?string $defaultFacultyId = null, ?string $termCode = null): array
    {
        $termCode = $termCode ?: \App\Models\AcademicTerm::getActiveTermCode();

        return DB::transaction(function () use ($subjects, $defaultFacultyId, $termCode) {
            $created = 0;
            $updated = 0;
            $skipped = 0;

            foreach ($subjects as $index => $subject) {
                $resolvedFaculty = $this->resolveFaculty($subject, $defaultFacultyId, $index);
                $subjectCode = $this->normalizeSubjectCode($subject['subjectCode'] ?? '');
                $originalSubjectCode = $this->normalizeSubjectCode($subject['originalSubjectCode'] ?? '') ?: $subjectCode;
                $subjectName = trim((string) ($subject['subjectName'] ?? ''));
                $groupCount = $this->normalizeGroupCount($subject['groupCount'] ?? 1);
                $types = $this->normalizeTypes($subject['types'] ?? []);
                $groupCounts = $this->buildGroupCounts($types, $subject['groupCounts'] ?? [], $groupCount);
                $groupCount = max(1, ...array_values($groupCounts));
                $rowTermCode = $subject['termCode'] ?? $termCode;

                $recordQuery = CatalogSubject::query()
                    ->where('faculty_id', $resolvedFaculty['id'])
                    ->where('subject_code', $originalSubjectCode);

                if ($rowTermCode) {
                    $recordQuery->where('term_code', $rowTermCode);
                }

                $record = $recordQuery->first() ?: new CatalogSubject([
                    'faculty_id' => $resolvedFaculty['id'],
                    'subject_code' => $subjectCode,
                ]);

                $isCreating = ! $record->exists;
                $oldSubjectCode = $record->exists ? $this->normalizeSubjectCode($record->subject_code) : null;
                $oldSubjectName = $record->exists ? trim((string) $record->subject_name) : null;
                $oldTermCode = $record->exists ? $record->term_code : null;

                if ($record->exists && $oldSubjectCode !== $subjectCode) {
                    $targetExists = CatalogSubject::query()
                        ->where('faculty_id', $resolvedFaculty['id'])
                        ->where('subject_code', $subjectCode)
                        ->when($rowTermCode, fn ($query) => $query->where('term_code', $rowTermCode))
                        ->whereKeyNot($record->getKey())
                        ->exists();

                    if ($targetExists) {
                        throw ValidationException::withMessages([
                            "subjects.$index.subjectCode" => ['The new subject code already exists for this faculty and term.'],
                        ]);
                    }
                }
                $hasChanges = $isCreating
                    || $record->subject_code !== $subjectCode
                    || $record->faculty_name !== $resolvedFaculty['name_ar']
                    || $record->subject_name !== $subjectName
                    || (int) $record->group_count !== $groupCount
                    || ($record->group_counts ?: []) !== $groupCounts
                    || ($record->types ?: ['Lecture']) !== $types
                    || $record->term_code !== $rowTermCode;

                if (! $hasChanges) {
                    $skipped++;

                    continue;
                }

                $record->fill([
                    'faculty_name' => $resolvedFaculty['name_ar'],
                    'subject_code' => $subjectCode,
                    'subject_name' => $subjectName,
                    'group_count' => $groupCount,
                    'group_counts' => $groupCounts,
                    'types' => $types,
                    'term_code' => $rowTermCode,
                ]);
                $record->save();

                if ($oldSubjectCode && ($oldSubjectCode !== $subjectCode || $oldSubjectName !== $subjectName)) {
                    $this->cascadeSubjectIdentityUpdate($oldSubjectCode, $subjectCode, $subjectName, $oldTermCode ?: $rowTermCode);
                }

                if ($isCreating) {
                    $created++;
                } else {
                    $updated++;
                }
            }

            return [
                'created' => $created,
                'updated' => $updated,
                'skipped' => $skipped,
            ];
        });
    }

    public function store(array $payload): CatalogSubject
    {
        return DB::transaction(function () use ($payload) {
            return $this->persistSubject(new CatalogSubject, $payload);
        });
    }

    public function update(CatalogSubject $subject, array $payload): CatalogSubject
    {
        return DB::transaction(function () use ($subject, $payload) {
            return $this->persistSubject($subject, $payload);
        });
    }

    public function delete(CatalogSubject $subject): void
    {
        $subject->delete();
    }

    private function resolveFaculty(array $subject, ?string $defaultFacultyId, int $index): array
    {
        $rowFaculty = trim((string) ($subject['faculty'] ?? ''));

        if ($defaultFacultyId) {
            $defaultFaculty = UniversityCatalog::findFaculty($defaultFacultyId);

            if (! $defaultFaculty) {
                throw ValidationException::withMessages([
                    'facultyId' => ['The selected faculty is invalid.'],
                ]);
            }

            if ($rowFaculty !== '') {
                $rowResolvedFaculty = UniversityCatalog::findFaculty($rowFaculty);

                if (! $rowResolvedFaculty) {
                    throw ValidationException::withMessages([
                        "subjects.$index.faculty" => ['The faculty in this row is invalid.'],
                    ]);
                }

                if (($rowResolvedFaculty['id'] ?? null) !== ($defaultFaculty['id'] ?? null)) {
                    throw ValidationException::withMessages([
                        "subjects.$index.faculty" => ['The faculty in this row does not match the selected faculty.'],
                    ]);
                }
            }

            return $defaultFaculty;
        }

        $resolvedFaculty = UniversityCatalog::findFaculty($rowFaculty);

        if (! $resolvedFaculty) {
            throw ValidationException::withMessages([
                "subjects.$index.faculty" => ['Each row must include a valid faculty when importing all faculties.'],
            ]);
        }

        return $resolvedFaculty;
    }

    private function normalizeSubjectCode(string $value): string
    {
        return Str::upper(trim($value));
    }

    private function persistSubject(CatalogSubject $subject, array $payload): CatalogSubject
    {
        $oldSubjectCode = $subject->exists ? $this->normalizeSubjectCode((string) $subject->subject_code) : null;
        $oldSubjectName = $subject->exists ? trim((string) $subject->subject_name) : null;
        $oldTermCode = $subject->exists ? $subject->term_code : null;
        $resolvedFaculty = UniversityCatalog::findFaculty(trim((string) ($payload['facultyId'] ?? '')));

        if (! $resolvedFaculty) {
            throw ValidationException::withMessages([
                'facultyId' => ['The selected faculty is invalid.'],
            ]);
        }

        $subjectCode = $this->normalizeSubjectCode((string) ($payload['subjectCode'] ?? ''));
        $subjectName = trim((string) ($payload['subjectName'] ?? ''));
        $groupCount = $this->normalizeGroupCount($payload['groupCount'] ?? 1);
        $types = $this->normalizeTypes($payload['types'] ?? []);
        $groupCounts = $this->buildGroupCounts($types, $payload['groupCounts'] ?? [], $groupCount);
        $groupCount = max(1, ...array_values($groupCounts));
        $termCode = $payload['termCode'] ?? $payload['term_code'] ?? \App\Models\AcademicTerm::getActiveTermCode();

        $duplicateQuery = CatalogSubject::query()
            ->where('faculty_id', $resolvedFaculty['id'])
            ->where('subject_code', $subjectCode);

        if ($termCode) {
            $duplicateQuery->where(function ($q) use ($termCode) {
                $q->where('term_code', $termCode)->orWhereNull('term_code');
            });
        }

        if ($subject->exists) {
            $duplicateQuery->whereKeyNot($subject->getKey());
        }

        if ($duplicateQuery->exists()) {
            throw ValidationException::withMessages([
                'subjectCode' => ['This subject code already exists for the selected faculty and term.'],
            ]);
        }

        $subject->fill([
            'faculty_id' => $resolvedFaculty['id'],
            'faculty_name' => $resolvedFaculty['name_ar'],
            'subject_code' => $subjectCode,
            'subject_name' => $subjectName,
            'group_count' => $groupCount,
            'group_counts' => $groupCounts,
            'types' => $types,
            'term_code' => $termCode,
        ]);
        $subject->save();

        if ($oldSubjectCode && ($oldSubjectCode !== $subjectCode || $oldSubjectName !== $subjectName)) {
            $this->cascadeSubjectIdentityUpdate(
                $oldSubjectCode,
                $subjectCode,
                $subjectName,
                $oldTermCode ?: $termCode,
            );
        }

        return $subject->fresh();
    }

    private function normalizeGroupCount(mixed $value): int
    {
        return max(1, min(26, (int) $value));
    }

    private function normalizeTypes(array $types): array
    {
        $normalized = collect($types)
            ->map(fn ($type) => trim((string) $type))
            ->filter(fn (string $type) => in_array($type, self::ALLOWED_TYPES, true))
            ->unique()
            ->values()
            ->all();

        return $normalized ?: ['Lecture'];
    }

    private function buildGroupCounts(array $types, mixed $values, int $fallback): array
    {
        $values = is_array($values) ? $values : [];

        return collect(self::ALLOWED_TYPES)->mapWithKeys(function (string $type) use ($types, $values, $fallback) {
            if (! in_array($type, $types, true)) {
                return [$type => 0];
            }

            $value = array_key_exists($type, $values) ? (int) $values[$type] : $fallback;

            return [$type => max(1, min(26, $value))];
        })->all();
    }

    private function cascadeSubjectIdentityUpdate(
        string $oldCode,
        string $newCode,
        string $newName,
        ?string $termCode,
    ): void {
        $scopeTerm = static function ($query) use ($termCode) {
            return $termCode ? $query->where('term_code', $termCode) : $query->whereNull('term_code');
        };

        $scopeTerm(DB::table('student_registrations')->whereRaw('UPPER(TRIM(subject_code)) = ?', [$oldCode]))
            ->update(['subject_code' => $newCode, 'subject_name' => $newName, 'updated_at' => now()]);
        $scopeTerm(DB::table('course_assignments')->whereRaw('UPPER(TRIM(course_id)) = ?', [$oldCode]))
            ->update(['course_id' => $newCode, 'name' => $newName, 'updated_at' => now()]);
        $scopeTerm(DB::table('lecture_sessions')->whereRaw('UPPER(TRIM(course_code)) = ?', [$oldCode]))
            ->update(['course_code' => $newCode, 'updated_at' => now()]);
        $scopeTerm(DB::table('attendance_records')->whereRaw('UPPER(TRIM(course_code)) = ?', [$oldCode]))
            ->update(['course_code' => $newCode, 'updated_at' => now()]);
        $scopeTerm(DB::table('ad_hoc_attendance_sessions')->whereRaw('UPPER(TRIM(subject_code)) = ?', [$oldCode]))
            ->update(['subject_code' => $newCode, 'subject_name' => $newName, 'updated_at' => now()]);
        $scopeTerm(DB::table('ad_hoc_attendance_sessions')->whereRaw('UPPER(TRIM(migrated_to_course_code)) = ?', [$oldCode]))
            ->update(['migrated_to_course_code' => $newCode, 'updated_at' => now()]);
    }
}
