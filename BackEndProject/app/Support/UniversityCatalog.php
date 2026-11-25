<?php

namespace App\Support;

class UniversityCatalog
{
    public const FACULTIES = [
        [
            'id' => 'engineering',
            'name_ar' => 'كليه الهندسه',
            'name_en' => 'Faculty of Engineering',
            'colleges' => [
                [
                    'id' => 'engineering',
                    'name_ar' => 'كليه الهندسه',
                    'name_en' => 'Faculty of Engineering',
                    'aliases' => ['Faculty of Engineering', 'Engineering', 'Electrical Engineering', 'Mechanical Engineering'],
                ],
            ],
        ],
        [
            'id' => 'computers-ai',
            'name_ar' => 'كليه الحاسبات والذكاء الاصطناعي',
            'name_en' => 'Faculty of Computers and Artificial Intelligence',
            'colleges' => [
                [
                    'id' => 'computers-ai',
                    'name_ar' => 'كليه الحاسبات والذكاء الاصطناعي',
                    'name_en' => 'Faculty of Computers and Artificial Intelligence',
                    'aliases' => ['Computer Science & Engineering', 'Computer Science', 'Faculty of Computers and Artificial Intelligence'],
                ],
            ],
        ],
        [
            'id' => 'nursing',
            'name_ar' => 'كليه التمريض',
            'name_en' => 'Faculty of Nursing',
            'colleges' => [
                ['id' => 'nursing', 'name_ar' => 'كليه التمريض', 'name_en' => 'Faculty of Nursing', 'aliases' => []],
            ],
        ],
        [
            'id' => 'medicine',
            'name_ar' => 'كليه الطب البشري',
            'name_en' => 'Faculty of Human Medicine',
            'colleges' => [
                ['id' => 'medicine', 'name_ar' => 'كليه الطب البشري', 'name_en' => 'Faculty of Human Medicine', 'aliases' => ['General Medicine', 'Faculty of Medicine']],
            ],
        ],
        [
            'id' => 'pharmacy',
            'name_ar' => 'كليه الصيدله',
            'name_en' => 'Faculty of Pharmacy',
            'colleges' => [
                ['id' => 'pharmacy', 'name_ar' => 'كليه الصيدله', 'name_en' => 'Faculty of Pharmacy', 'aliases' => []],
            ],
        ],
        [
            'id' => 'humanities',
            'name_ar' => 'علوم انسانيه',
            'name_en' => 'Humanities',
            'colleges' => [
                ['id' => 'humanities', 'name_ar' => 'علوم انسانيه', 'name_en' => 'Humanities', 'aliases' => ['Human Sciences']],
            ],
        ],
        [
            'id' => 'health-sciences-technology',
            'name_ar' => 'تكنولوجيا العلوم الصحيه',
            'name_en' => 'Health Sciences Technology',
            'colleges' => [
                ['id' => 'health-sciences-technology', 'name_ar' => 'تكنولوجيا العلوم الصحيه', 'name_en' => 'Health Sciences Technology', 'aliases' => []],
            ],
        ],
        [
            'id' => 'dentistry',
            'name_ar' => 'كليه طب الاسنان',
            'name_en' => 'Faculty of Dentistry',
            'colleges' => [
                ['id' => 'dentistry', 'name_ar' => 'كليه طب الاسنان', 'name_en' => 'Faculty of Dentistry', 'aliases' => []],
            ],
        ],
        [
            'id' => 'veterinary-medicine',
            'name_ar' => 'كليه الطب البيطري',
            'name_en' => 'Faculty of Veterinary Medicine',
            'colleges' => [
                ['id' => 'veterinary-medicine', 'name_ar' => 'كليه الطب البيطري', 'name_en' => 'Faculty of Veterinary Medicine', 'aliases' => []],
            ],
        ],
        [
            'id' => 'physical-therapy',
            'name_ar' => 'كليه العلاج الطبيعي',
            'name_en' => 'Faculty of Physical Therapy',
            'colleges' => [
                ['id' => 'physical-therapy', 'name_ar' => 'كليه العلاج الطبيعي', 'name_en' => 'Faculty of Physical Therapy', 'aliases' => []],
            ],
        ],
    ];

    public static function faculties(): array
    {
        return self::FACULTIES;
    }

    public static function canonicalFacultyId(?string $faculty): ?string
    {
        return self::findFaculty($faculty)['id'] ?? null;
    }

    public static function canonicalFacultyNameAr(?string $faculty): ?string
    {
        return self::findFaculty($faculty)['name_ar'] ?? ($faculty !== null ? trim($faculty) : null);
    }

    public static function findFaculty(?string $faculty): ?array
    {
        $normalized = self::normalizeName($faculty);
        if ($normalized === '') {
            return null;
        }

        foreach (self::FACULTIES as $record) {
            $names = [
                $record['id'] ?? '',
                $record['name_ar'] ?? '',
                $record['name_en'] ?? '',
            ];

            foreach ($names as $name) {
                if (self::normalizeName($name) === $normalized) {
                    return $record;
                }
            }
        }

        $college = self::findCollege($faculty);

        if (! $college) {
            return null;
        }

        foreach (self::FACULTIES as $record) {
            if (($record['id'] ?? null) === ($college['faculty_id'] ?? null)) {
                return $record;
            }
        }

        return null;
    }

    public static function canonicalCollegeName(?string $college): ?string
    {
        $record = self::findCollege($college);

        return $record['name_ar'] ?? ($college !== null ? trim($college) : null);
    }

    public static function colleges(): array
    {
        return collect(self::FACULTIES)
            ->flatMap(fn (array $faculty) => collect($faculty['colleges'])->map(fn (array $college) => [
                ...$college,
                'faculty_id' => $faculty['id'],
                'faculty_name_ar' => $faculty['name_ar'],
                'faculty_name_en' => $faculty['name_en'],
            ]))
            ->values()
            ->all();
    }

    public static function findCollege(?string $college): ?array
    {
        $normalized = self::normalizeName($college);
        if ($normalized === '') {
            return null;
        }

        foreach (self::colleges() as $record) {
            $names = [
                $record['id'] ?? '',
                $record['name_ar'] ?? '',
                $record['name_en'] ?? '',
                ...($record['aliases'] ?? []),
            ];

            foreach ($names as $name) {
                if (self::normalizeName($name) === $normalized) {
                    return $record;
                }
            }
        }

        return null;
    }

    public static function sameCollege(?string $left, ?string $right): bool
    {
        return self::normalizeName(self::canonicalCollegeName($left)) === self::normalizeName(self::canonicalCollegeName($right));
    }

    public static function normalizeName(?string $value): string
    {
        $normalized = mb_strtolower(trim((string) $value));
        $normalized = str_replace(['أ', 'إ', 'آ'], 'ا', $normalized);
        $normalized = str_replace('ة', 'ه', $normalized);
        $normalized = str_replace(['ى', 'ي'], 'ي', $normalized);
        $normalized = preg_replace('/\s+/u', ' ', $normalized) ?: '';

        return $normalized;
    }
}
