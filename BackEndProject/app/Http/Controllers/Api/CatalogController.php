<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CatalogSubjectResource;
use App\Services\Catalog\CatalogSubjectService;
use App\Support\UniversityCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function __construct(
        private readonly CatalogSubjectService $subjects,
    ) {}

    public function faculties(): JsonResponse
    {
        return response()->json([
            'faculties' => UniversityCatalog::faculties(),
        ]);
    }

    public function subjects(Request $request): JsonResponse
    {
        $facultyId = $request->query('facultyId');
        $termCode = $request->header('X-Academic-Term') ?: $request->query('term_code') ?: $request->query('termCode');
        $subjects = $this->subjects->list(
            is_string($facultyId) && $facultyId !== '' ? $facultyId : null,
            is_string($termCode) && $termCode !== '' ? $termCode : null,
        );

        return response()->json([
            'subjects' => CatalogSubjectResource::collection($subjects)->resolve($request),
        ]);
    }
}
