import * as XLSX from 'xlsx';
import { buildImportSampleRows, DOCTOR_TEMPLATE_HEADERS, parseAdminImportFile } from './importWorkbook';
import { buildAssignmentFromInput, doctorHasAssignment, getDoctorFacultyIds, getTeachingFacultyIds } from './adminPanelUtils';

test('doctor template excludes department and specialty columns', () => {
  expect(DOCTOR_TEMPLATE_HEADERS).toEqual([
    'doctor_name',
    'doctor_national_id',
    'doctor_email',
    'doctor_password',
    'subject_code',
    'subject_name',
    'subject_type',
    'faculty',
  ]);
});

test('doctor import resolves the only college from faculty without a department column', () => {
  const result = buildAssignmentFromInput({
    courseCode: 'CS101',
    courseName: 'Introduction to Programming',
    faculty: 'computers-ai',
    college: '',
    type: 'Lecture',
  });

  expect(result.error).toBeUndefined();
  expect(result.assignment.college).toBe('computers-ai');
});

test('downloaded demo rows include two doctors teaching in engineering and computers-ai with stable identities', async () => {
  const rows = buildImportSampleRows();
  for (const name of ['Dr. Ahmed Ali', 'Dr. Mona Hassan']) {
    const sharedRows = rows.filter((row) => row.doctor_name === name && ['engineering', 'computers-ai'].includes(row.faculty));
    expect(new Set(sharedRows.map((row) => row.faculty))).toEqual(new Set(['engineering', 'computers-ai']));
    expect(new Set(sharedRows.map((row) => row.doctor_national_id)).size).toBe(1);
    expect(new Set(sharedRows.map((row) => row.doctor_email)).size).toBe(1);
    for (const facultyId of ['engineering', 'computers-ai']) {
      expect(buildImportSampleRows({ facultyId }).filter((row) => row.doctor_name === name))
        .toEqual(sharedRows.filter((row) => row.faculty === facultyId));
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Doctors');
  const file = new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], 'template.xlsx');
  const preview = await parseAdminImportFile(file);
  expect(preview.invalidRows).toEqual([]);
  for (const name of ['Dr. Ahmed Ali', 'Dr. Mona Hassan']) {
    const doctor = preview.groupedDoctors.find((item) => item.name === name && getTeachingFacultyIds(item.assignments).includes('engineering'));
    expect(getTeachingFacultyIds(doctor.assignments)).toEqual(['engineering', 'computers-ai']);
    expect(doctor.assignments).toHaveLength(6);
  }
});

test('one doctor retains the same subject code in two faculties and both faculties appear for editing', async () => {
  const originalReader = global.FileReader;
  global.FileReader = class {
    readAsArrayBuffer(file) {
      this.result = file.buffer;
      this.onload();
    }
  };
  try {
    const row = {
      doctor_name: 'Dr Example', doctor_national_id: '29001011234567',
      subject_code: 'SHARED101', subject_name: 'Shared Subject', subject_type: 'Lecture', faculty: 'engineering',
    };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
      row, { ...row, faculty: 'computers-ai' }, row,
    ]), 'Doctors');
    const preview = await parseAdminImportFile({ name: 'doctors.xlsx', buffer: XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) });
    expect(preview.invalidRows).toEqual([]);
    expect(preview.groupedDoctors).toHaveLength(1);
    const courses = preview.groupedDoctors[0].assignments;
    expect(courses).toHaveLength(2);
    expect(getTeachingFacultyIds(courses)).toEqual(['engineering', 'computers-ai']);
    expect(getDoctorFacultyIds({ courses, allowedColleges: [] })).toEqual(['engineering', 'computers-ai']);
    expect(doctorHasAssignment({ courses: [courses[0]] }, courses[1])).toBe(false);
    expect(doctorHasAssignment({ courses }, courses[1])).toBe(true);
  } finally {
    global.FileReader = originalReader;
  }
});
