<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\AttendanceRecord;
use App\Models\LectureSession;
use App\Support\Permissions;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AcademicTermController extends Controller
{
    public function index(): JsonResponse
    {
        $terms = AcademicTerm::query()->orderByDesc('is_active')->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $terms->map(fn (AcademicTerm $term) => $this->termPayload($term)),
        ]);
    }

    public function active(): JsonResponse
    {
        $term = AcademicTerm::getActiveTerm();

        if (! $term) {
            return response()->json(['message' => 'No active academic term found.'], 404);
        }

        return response()->json([
            'data' => $this->termPayload($term),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeTermManagement($request);
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:academic_terms,code'],
            'name' => ['required', 'string', 'max:255'],
            'academicYear' => ['nullable', 'string', 'max:50'],
            'startDate' => ['nullable', 'date'],
            'endDate' => ['nullable', 'date', 'after_or_equal:startDate'],
            'weeksCount' => ['nullable', 'integer', 'min:1', 'max:52'],
            'isActive' => ['nullable', 'boolean'],
        ]);

        $code = Str::upper(trim($data['code']));
        $startDate = ! empty($data['startDate']) ? Carbon::parse($data['startDate']) : null;
        $endDate = ! empty($data['endDate']) ? Carbon::parse($data['endDate']) : null;

        $computedWeeks = $this->calculateWeeks($startDate, $endDate);
        $weeksCount = isset($data['weeksCount']) && (int) $data['weeksCount'] > 0
            ? (int) $data['weeksCount']
            : $computedWeeks;

        $isActive = ! empty($data['isActive']);

        $term = DB::transaction(function () use ($code, $data, $startDate, $endDate, $weeksCount, $isActive) {
            if ($isActive) {
                AcademicTerm::query()->update(['is_active' => false]);
            }

            // If this is the first term ever created, make it active
            if (AcademicTerm::query()->count() === 0) {
                $isActive = true;
            }

            return AcademicTerm::query()->create([
                'code' => $code,
                'name' => trim($data['name']),
                'academic_year' => ! empty($data['academicYear']) ? trim($data['academicYear']) : null,
                'start_date' => $startDate ? $startDate->format('Y-m-d') : null,
                'end_date' => $endDate ? $endDate->format('Y-m-d') : null,
                'weeks_count' => $weeksCount,
                'is_active' => $isActive,
            ]);
        });

        return response()->json([
            'message' => 'Academic term created successfully.',
            'data' => $this->termPayload($term),
        ], 201);
    }

    public function update(Request $request, AcademicTerm $term): JsonResponse
    {
        $this->authorizeTermManagement($request);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'academicYear' => ['nullable', 'string', 'max:50'],
            'startDate' => ['nullable', 'date'],
            'endDate' => ['nullable', 'date', 'after_or_equal:startDate'],
            'weeksCount' => ['nullable', 'integer', 'min:1', 'max:52'],
            'isActive' => ['nullable', 'boolean'],
        ]);

        $startDate = array_key_exists('startDate', $data)
            ? (! empty($data['startDate']) ? Carbon::parse($data['startDate']) : null)
            : ($term->start_date ? Carbon::parse($term->start_date) : null);

        $endDate = array_key_exists('endDate', $data)
            ? (! empty($data['endDate']) ? Carbon::parse($data['endDate']) : null)
            : ($term->end_date ? Carbon::parse($term->end_date) : null);

        $computedWeeks = $this->calculateWeeks($startDate, $endDate);

        if (array_key_exists('weeksCount', $data) && (int) $data['weeksCount'] > 0) {
            $weeksCount = (int) $data['weeksCount'];
        } else {
            $weeksCount = $computedWeeks;
        }

        DB::transaction(function () use ($term, $data, $startDate, $endDate, $weeksCount) {
            if (! empty($data['isActive']) && ! $term->is_active) {
                AcademicTerm::query()->update(['is_active' => false]);
                $term->is_active = true;
            }

            if (isset($data['name'])) {
                $term->name = trim($data['name']);
            }
            if (array_key_exists('academicYear', $data)) {
                $term->academic_year = ! empty($data['academicYear']) ? trim($data['academicYear']) : null;
            }

            $term->start_date = $startDate ? $startDate->format('Y-m-d') : null;
            $term->end_date = $endDate ? $endDate->format('Y-m-d') : null;
            $term->weeks_count = $weeksCount;
            $term->save();
        });

        return response()->json([
            'message' => 'Academic term updated successfully.',
            'data' => $this->termPayload($term->fresh()),
        ]);
    }

    public function setActive(AcademicTerm $term): JsonResponse
    {
        $this->authorizeTermManagement(request());
        DB::transaction(function () use ($term) {
            AcademicTerm::query()->update(['is_active' => false]);
            $term->update(['is_active' => true]);
        });

        return response()->json([
            'message' => "Academic term '{$term->name}' is now active.",
            'data' => $this->termPayload($term->fresh()),
        ]);
    }

    public function destroy(AcademicTerm $term): JsonResponse
    {
        $this->authorizeTermManagement(request());
        $hasSessions = LectureSession::query()->where('term_code', $term->code)->exists();
        $hasAttendance = AttendanceRecord::query()->where('term_code', $term->code)->exists();

        if ($hasSessions || $hasAttendance) {
            return response()->json([
                'message' => 'Cannot delete an academic term that contains active attendance records or lecture sessions.',
            ], 422);
        }

        if ($term->is_active) {
            return response()->json([
                'message' => 'Cannot delete the currently active academic term. Please set another term as active first.',
            ], 422);
        }

        $term->delete();

        return response()->json(null, 204);
    }

    private function calculateWeeks(?Carbon $startDate, ?Carbon $endDate): int
    {
        if (! $startDate || ! $endDate) {
            return 14;
        }

        $days = $startDate->diffInDays($endDate) + 1;
        $weeks = (int) ceil($days / 7);

        return max(1, min(52, $weeks));
    }

    private function authorizeTermManagement(Request $request): void
    {
        $user = $request->user();

        abort_unless($user !== null, 403);

        if ($user->is_system || $user->role === 'admin') {
            return;
        }

        $permissions = $user->permissions ?: [];

        abort_unless(
            in_array(Permissions::MANAGE_ACADEMIC_TERMS, $permissions, true)
            || in_array(Permissions::FULL_DASHBOARD_ACCESS, $permissions, true),
            403,
        );
    }

    private function termPayload(AcademicTerm $term): array
    {
        return [
            'id' => $term->id,
            'code' => $term->code,
            'name' => $term->name,
            'academicYear' => $term->academic_year,
            'startDate' => $term->start_date ? Carbon::parse($term->start_date)->format('Y-m-d') : null,
            'endDate' => $term->end_date ? Carbon::parse($term->end_date)->format('Y-m-d') : null,
            'weeksCount' => (int) ($term->weeks_count ?: 14),
            'isActive' => (bool) $term->is_active,
            'createdAt' => optional($term->created_at)->toISOString(),
            'updatedAt' => optional($term->updated_at)->toISOString(),
        ];
    }
}
