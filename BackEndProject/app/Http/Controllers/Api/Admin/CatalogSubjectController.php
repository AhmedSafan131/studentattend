<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\ImportCatalogSubjectsRequest;
use App\Http\Requests\Api\Admin\SaveCatalogSubjectRequest;
use App\Http\Resources\CatalogSubjectResource;
use App\Models\CatalogSubject;
use App\Services\Catalog\CatalogSubjectService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogSubjectController extends Controller
{
    public function __construct(
        private readonly CatalogSubjectService $subjects,
    ) {}

    public function import(ImportCatalogSubjectsRequest $request): JsonResponse
    {
        $termCode = \App\Models\AcademicTerm::getActiveTermCode();

        $summary = $this->subjects->import(
            $request->validated('subjects', []),
            $request->validated('facultyId'),
            $termCode,
        );

        $importedSubjects = $this->subjects->list($request->validated('facultyId'), $termCode);

        return response()->json([
            'summary' => $summary,
            'subjects' => CatalogSubjectResource::collection($importedSubjects)->resolve($request),
        ]);
    }

    public function store(SaveCatalogSubjectRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $payload['termCode'] = \App\Models\AcademicTerm::getActiveTermCode();

        $subject = $this->subjects->store($payload);

        return response()->json([
            'subject' => (new CatalogSubjectResource($subject))->resolve($request),
        ], 201);
    }

    public function update(SaveCatalogSubjectRequest $request, CatalogSubject $catalogSubject): JsonResponse
    {
        $payload = $request->validated();
        $payload['termCode'] = \App\Models\AcademicTerm::getActiveTermCode();

        $subject = $this->subjects->update($catalogSubject, $payload);

        return response()->json([
            'subject' => (new CatalogSubjectResource($subject))->resolve($request),
        ]);
    }

    public function destroy(Request $request, CatalogSubject $catalogSubject): JsonResponse
    {
        $this->authorizeCatalogManagement($request);
        $this->subjects->delete($catalogSubject);

        return response()->json([
            'deleted' => true,
            'id' => $catalogSubject->id,
        ]);
    }

    private function authorizeCatalogManagement(Request $request): void
    {
        $user = $request->user();

        abort_unless($user !== null, 403);

        if ($user->is_system || $user->role === 'admin') {
            return;
        }

        $permissions = $user->permissions ?: [];

        abort_unless(
            in_array(Permissions::MANAGE_SUBJECT_CATALOG, $permissions, true)
            || in_array(Permissions::FULL_DASHBOARD_ACCESS, $permissions, true),
            403,
        );
    }
}
