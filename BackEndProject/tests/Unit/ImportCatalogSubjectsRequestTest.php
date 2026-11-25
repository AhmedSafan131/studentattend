<?php

namespace Tests\Unit;

use App\Http\Requests\Api\Admin\ImportCatalogSubjectsRequest;
use Illuminate\Translation\ArrayLoader;
use Illuminate\Translation\Translator;
use Illuminate\Validation\Factory;
use Illuminate\Validation\Validator;
use PHPUnit\Framework\TestCase;

class ImportCatalogSubjectsRequestTest extends TestCase
{
    private function validator(array $types): Validator
    {
        $data = ['subjects' => array_map(fn ($subjectTypes) => [
            'subjectName' => 'Circuit Analysis',
            'subjectCode' => 'EE101',
            'faculty' => 'engineering',
            'groupCount' => 2,
            'groupCounts' => ['Lecture' => 1, 'Section' => 2, 'Practical' => 1],
            'types' => $subjectTypes,
        ], $types)];
        $request = new ImportCatalogSubjectsRequest($data);
        $factory = new Factory(new Translator(new ArrayLoader, 'en'));

        return $factory->make($data, $request->rules());
    }

    public function test_different_subjects_can_share_types(): void
    {
        $validator = $this->validator(array_fill(0, 39, ['Lecture', 'Section', 'Practical']));

        $this->assertTrue($validator->passes(), $validator->errors()->toJson());
    }

    public function test_duplicate_types_within_a_subject_are_rejected(): void
    {
        $validator = $this->validator([
            ['Lecture', 'Section', 'Practical'],
            ['Lecture', 'Lecture'],
        ]);

        $this->assertTrue($validator->fails());
        $this->assertTrue($validator->errors()->has('subjects.1.types.0'));
        $this->assertFalse($validator->errors()->has('subjects.0.types.0'));
    }

    public function test_unknown_and_empty_types_are_rejected(): void
    {
        foreach ([['Unknown'], []] as $types) {
            $this->assertTrue($this->validator([$types])->fails());
        }
    }
}
