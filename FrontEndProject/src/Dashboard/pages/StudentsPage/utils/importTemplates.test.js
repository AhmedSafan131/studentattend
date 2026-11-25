import * as XLSX from 'xlsx';
import { FACULTY_CATALOG } from '../../../../utils/constants';
import { buildImportSampleRows, DOCTOR_TEMPLATE_HEADERS, parseAdminImportFile } from '../../AdminPanel/utils/importWorkbook';
import { buildTemplateSubjectCatalog } from '../../sharedImportTemplateData';
import { ALL_STUDENT_FACULTIES, buildStudentTemplateRows, parseStudentsWorkbook, parseStudentsWorkbooks, STUDENT_TEMPLATE_HEADERS } from './importStudentsWorkbook';
import { buildSubjectTemplateRows, parseSubjectsWorkbook, SUBJECT_TEMPLATE_HEADERS } from '../../SubjectsCatalog/utils/importSubjectsWorkbook';

const asWorkbookFile = (rows, headers) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows, { header: headers }), 'Import');
  return { name: 'demo.xlsx', buffer: XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) };
};

beforeAll(() => {
  global.FileReader = class {
    readAsArrayBuffer(file) {
      this.result = file.buffer;
      this.onload();
    }
  };
});

test('the combined student template uses faculty codes and imports every faculty', async () => {
  const rows = buildStudentTemplateRows();
  expect(new Set(rows.map((row) => row.faculty))).toEqual(new Set(FACULTY_CATALOG.map((faculty) => faculty.id)));
  expect(STUDENT_TEMPLATE_HEADERS).toContain('faculty');
  expect(STUDENT_TEMPLATE_HEADERS).not.toContain('college');
  const preview = await parseStudentsWorkbooks([asWorkbookFile(rows, STUDENT_TEMPLATE_HEADERS)], {
    facultyId: ALL_STUDENT_FACULTIES,
    catalogSubjects: buildTemplateSubjectCatalog(),
  });
  expect(preview.invalidRows).toEqual([]);
  expect(preview.students).toHaveLength(50 * FACULTY_CATALOG.length);
});

test('multi-faculty imports validate subjects within the row faculty and reject unknown or unauthorized faculties', async () => {
  const row = buildStudentTemplateRows({ facultyId: 'engineering' })[0];
  const catalog = buildTemplateSubjectCatalog();
  const foreignCode = catalog.find((subject) => subject.facultyId === 'computers-ai').subjectCode;
  for (const [rows, options] of [
    [[{ ...row, faculty: 'unknown' }], {}],
    [[{ ...row, subject_code: foreignCode }], {}],
    [[row], { allowedFacultyIds: ['computers-ai'] }],
    [[row], { facultyId: 'computers-ai' }],
    [[{ ...row, faculty: '' }], {}],
  ]) {
    const preview = await parseStudentsWorkbook(asWorkbookFile(rows, STUDENT_TEMPLATE_HEADERS), {
      facultyId: ALL_STUDENT_FACULTIES, catalogSubjects: catalog, ...options,
    });
    expect(preview.invalidRows).toHaveLength(1);
    expect(preview.students).toHaveLength(0);
  }
});

test('all faculty templates share the same subject codes and subject types', () => {
  const subjects = buildSubjectTemplateRows();
  const doctors = buildImportSampleRows();
  const subjectKeys = new Set(subjects.map((row) => `${row.faculty}:${row.subject_code}`));
  const doctorKeys = new Set(doctors.map((row) => `${row.faculty}:${row.subject_code}`));

  expect(subjectKeys.size).toBeGreaterThan(0);
  expect(doctorKeys).toEqual(subjectKeys);
  expect(new Set(subjects.map((row) => row.faculty))).toEqual(new Set(FACULTY_CATALOG.map((faculty) => faculty.id)));
  expect(doctors.every((row) => row.subject_name && row.doctor_national_id.length === 14)).toBe(true);
  expect(subjects.every((row) => row.subject_name && row.lecture_group_count > 0 && row.section_group_count > 0 && row.practical_group_count > 0)).toBe(true);
  expect(DOCTOR_TEMPLATE_HEADERS).not.toContain('department');
  expect(DOCTOR_TEMPLATE_HEADERS).not.toContain('doctor_specialty');
});

test.each(FACULTY_CATALOG.map((faculty) => faculty.id))('%s demo sheets parse cleanly and every student registration matches the doctors and catalog', async (facultyId) => {
  const subjects = buildSubjectTemplateRows({ selectedFacultyId: facultyId });
  const doctors = buildImportSampleRows({ facultyId });
  const students = buildStudentTemplateRows({ facultyId });
  const catalog = buildTemplateSubjectCatalog(facultyId);
  const doctorKeys = new Set(doctors.map((row) => `${row.subject_code}:${row.subject_type}`));
  const subjectByCode = new Map(catalog.map((subject) => [subject.subjectCode, subject]));

  expect(subjects.length).toBeGreaterThan(0);
  expect(doctors.length).toBe(subjects.length * 3);
  expect(new Set(students.map((row) => row.student_id)).size).toBe(50);
  const registrationCounts = students.reduce((counts, row) => counts.set(row.student_id, (counts.get(row.student_id) || 0) + 1), new Map());
  expect([...registrationCounts.values()].every((count) => count >= 5 && count <= 7)).toBe(true);
  expect(students.every((row) => {
    const subject = subjectByCode.get(row.subject_code);
    return subject && doctorKeys.has(`${row.subject_code}:${row.type}`)
      && subject.groupsByType[row.type].includes(row.group);
  })).toBe(true);

  const [subjectPreview, doctorPreview, studentPreview] = await Promise.all([
    parseSubjectsWorkbook(asWorkbookFile(subjects, SUBJECT_TEMPLATE_HEADERS), { selectedFacultyId: facultyId }),
    parseAdminImportFile(asWorkbookFile(doctors, DOCTOR_TEMPLATE_HEADERS), { facultyId, students: [] }),
    parseStudentsWorkbook(asWorkbookFile(students, STUDENT_TEMPLATE_HEADERS), { facultyId, catalogSubjects: catalog }),
  ]);

  expect(subjectPreview.invalidRows).toEqual([]);
  expect(subjectPreview.subjects).toHaveLength(subjects.length);
  expect(doctorPreview.invalidRows).toEqual([]);
  expect(doctorPreview.groupedDoctors).toHaveLength(subjects.length);
  expect(studentPreview.invalidRows).toEqual([]);
  expect(studentPreview.students).toHaveLength(50);
});
