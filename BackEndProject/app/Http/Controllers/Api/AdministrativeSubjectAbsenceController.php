<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\AdministrativeSubjectAbsence;
use App\Models\AttendanceRecord;
use App\Models\CatalogSubject;
use App\Models\User;
use App\Support\UniversityCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdministrativeSubjectAbsenceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $termCode = $request->header('X-Academic-Term') ?: AcademicTerm::getActiveTermCode();

        $records = AdministrativeSubjectAbsence::query()
            ->with('student:id,name,full_name,student_id,university_id,national_id,college')
            ->where('term_code', $termCode)
            ->latest()
            ->get();

        return response()->json(['records' => $records->map(fn ($record) => $this->payload($record))]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'studentId' => ['required', 'string'],
            'facultyId' => ['required', 'string'],
            'subjectCode' => ['required', 'string'],
            'lectureType' => ['required', 'string', 'in:Lecture,Section,Practical'],
            'group' => ['required', 'string'],
            'week' => ['required', 'string'],
        ]);
        $termCode = AcademicTerm::getActiveTermCode();
        $student = User::query()->where('role', 'student')->where(function ($query) use ($data) {
            $query->where('id', $data['studentId'])->orWhere('student_id', $data['studentId'])
                ->orWhere('university_id', $data['studentId'])->orWhere('national_id', $data['studentId']);
        })->firstOrFail();

        $studentFacultyId = UniversityCatalog::canonicalFacultyId($student->college);
        abort_unless($studentFacultyId === $data['facultyId'], 422, 'The selected student does not belong to this faculty.');

        $subjectCode = Str::upper(trim($data['subjectCode']));
        $subject = CatalogSubject::query()->where('faculty_id', $data['facultyId'])
            ->whereRaw('UPPER(subject_code) = ?', [$subjectCode])
            ->where(fn ($query) => $query->where('term_code', $termCode)->orWhereNull('term_code'))
            ->orderByRaw('CASE WHEN term_code = ? THEN 0 ELSE 1 END', [$termCode])->first();
        abort_unless($subject, 422, 'The selected subject is not registered in this faculty catalog.');

        $group = Str::upper(trim($data['group']));
        $week = (string) ((int) preg_replace('/\D+/', '', $data['week']));
        $registered = $student->registrations()
            ->where('term_code', $termCode)
            ->whereRaw('UPPER(TRIM(subject_code)) = ?', [$subjectCode])
            ->get()
            ->contains(fn ($registration) => (
                Str::upper(trim((string) $registration->type)) === Str::upper($data['lectureType'])
                && Str::upper(trim((string) $registration->group)) === $group
            ));
        abort_unless($registered, 422, 'This student is not registered in the selected subject, type, and group.');

        $alreadyPresent = AttendanceRecord::query()
            ->where('student_id', $student->id)
            ->where('term_code', $termCode)
            ->with('lectureSession')
            ->whereHas('lectureSession', fn ($query) => $query
                ->whereRaw('UPPER(TRIM(course_code)) = ?', [$subjectCode])
                ->whereRaw('UPPER(TRIM(lecture_type)) = ?', [Str::upper($data['lectureType'])])
                ->whereRaw('UPPER(TRIM(`group`)) = ?', [$group]))
            ->get()
            ->contains(fn (AttendanceRecord $record) => (
                (string) ((int) preg_replace('/\D+/', '', (string) ($record->lectureSession?->week ?: $record->week))) === $week
            ));
        abort_if($alreadyPresent, 422, 'This student is already recorded as present for the selected subject session.');

        $record = AdministrativeSubjectAbsence::query()->firstOrCreate([
            'student_id' => $student->id,
            'subject_code' => $subjectCode,
            'lecture_type' => $data['lectureType'],
            'group' => $group,
            'week' => $week,
            'term_code' => $termCode,
        ], [
            'created_by' => $request->user()->id,
            'source' => 'administrative',
            'faculty_id' => $data['facultyId'],
            'subject_name' => $subject->subject_name,
        ]);

        return response()->json(['record' => $this->payload($record->load('student'))], $record->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, AdministrativeSubjectAbsence $absence): JsonResponse
    {
        $this->authorizeAdmin($request);
        $absence->delete();
        return response()->json(null, 204);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Only administrators can manage subject absences.');
    }

    private function payload(AdministrativeSubjectAbsence $record): array
    {
        return [
            'id' => $record->id,
            'studentId' => $record->student_id,
            'studentUniversityId' => $record->student?->university_id ?: $record->student?->student_id,
            'studentName' => $record->student?->full_name ?: $record->student?->name,
            'college' => $record->student?->college,
            'facultyId' => $record->faculty_id,
            'courseCode' => $record->subject_code,
            'subjectName' => $record->subject_name,
            'lectureType' => $record->lecture_type,
            'group' => $record->group,
            'week' => $record->week,
            'source' => $record->source,
            'lectureSessionId' => $record->lecture_session_id,
            'time' => optional($record->created_at)->format('h:i:s A'),
        ];
    }
}
