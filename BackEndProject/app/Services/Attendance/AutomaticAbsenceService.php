<?php

namespace App\Services\Attendance;

use App\Models\AdministrativeSubjectAbsence;
use App\Models\AttendanceRecord;
use App\Models\CatalogSubject;
use App\Models\LectureSession;
use App\Models\StudentRegistration;
use App\Support\UniversityCatalog;

class AutomaticAbsenceService
{
    public const SOURCE = 'automatic_session';

    public function recordForEndedSession(LectureSession $session): int
    {
        $courseCode = $this->normalizeCode($session->course_code);
        $lectureType = $this->normalizeCode($session->lecture_type);
        $group = $this->normalizeCode($session->group);
        $week = $this->normalizeWeek($session->week);

        $registrations = StudentRegistration::query()
            ->with('user')
            ->where('term_code', $session->term_code)
            ->whereRaw('UPPER(TRIM(subject_code)) = ?', [$courseCode])
            ->whereRaw('UPPER(TRIM(`type`)) = ?', [$lectureType])
            ->whereRaw('UPPER(TRIM(`group`)) = ?', [$group])
            ->whereHas('user', fn ($query) => $query->where('role', 'student'))
            ->get()
            ->unique('user_id')
            ->values();

        if ($registrations->isEmpty()) {
            return 0;
        }

        $studentIds = $registrations->pluck('user_id')->all();
        $presentStudentIds = AttendanceRecord::query()
            ->with('lectureSession')
            ->whereIn('student_id', $studentIds)
            ->where('term_code', $session->term_code)
            ->whereRaw('UPPER(TRIM(course_code)) = ?', [$courseCode])
            ->whereRaw('UPPER(TRIM(lecture_type)) = ?', [$lectureType])
            ->get()
            ->filter(fn (AttendanceRecord $record) => (
                $this->normalizeWeek($record->lectureSession?->week ?: $record->week) === $week
            ))
            ->pluck('student_id')
            ->flip();

        $existingAbsenceStudentIds = AdministrativeSubjectAbsence::query()
            ->whereIn('student_id', $studentIds)
            ->where('term_code', $session->term_code)
            ->whereRaw('UPPER(TRIM(subject_code)) = ?', [$courseCode])
            ->whereRaw('UPPER(TRIM(lecture_type)) = ?', [$lectureType])
            ->get()
            ->filter(fn (AdministrativeSubjectAbsence $absence) => (
                $this->normalizeWeek($absence->week) === $week
            ))
            ->pluck('student_id')
            ->flip();

        $catalogFacultyId = CatalogSubject::query()
            ->whereRaw('UPPER(TRIM(subject_code)) = ?', [$courseCode])
            ->where(fn ($query) => $query
                ->where('term_code', $session->term_code)
                ->orWhereNull('term_code'))
            ->value('faculty_id');
        $created = 0;

        foreach ($registrations as $registration) {
            if ($presentStudentIds->has($registration->user_id)
                || $existingAbsenceStudentIds->has($registration->user_id)) {
                continue;
            }

            $student = $registration->user;
            $facultyId = UniversityCatalog::canonicalFacultyId($student?->college)
                ?: $catalogFacultyId
                ?: trim((string) $student?->college)
                ?: 'unknown';

            AdministrativeSubjectAbsence::query()->create([
                'lecture_session_id' => $session->id,
                'student_id' => $registration->user_id,
                'created_by' => $session->user_id,
                'source' => self::SOURCE,
                'faculty_id' => $facultyId,
                'subject_code' => $courseCode,
                'subject_name' => trim((string) $registration->subject_name) ?: $courseCode,
                'lecture_type' => $session->lecture_type,
                'group' => $group,
                'week' => $week,
                'term_code' => $session->term_code,
            ]);
            $existingAbsenceStudentIds->put($registration->user_id, true);
            $created++;
        }

        return $created;
    }

    public function removeForReopenedSession(LectureSession $session): void
    {
        AdministrativeSubjectAbsence::query()
            ->where('lecture_session_id', $session->id)
            ->where('source', self::SOURCE)
            ->delete();
    }

    private function normalizeCode(?string $value): string
    {
        return strtoupper(trim((string) $value));
    }

    private function normalizeWeek(?string $value): string
    {
        preg_match('/\d+/', (string) $value, $matches);

        return isset($matches[0]) ? (string) ((int) $matches[0]) : $this->normalizeCode($value);
    }
}
