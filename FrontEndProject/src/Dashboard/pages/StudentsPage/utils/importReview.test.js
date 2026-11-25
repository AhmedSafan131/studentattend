import * as XLSX from 'xlsx';
import { parseAdminImportFile } from '../../AdminPanel/utils/importWorkbook';
import { parseStudentsWorkbook } from './importStudentsWorkbook';
import { parseSubjectsWorkbook } from '../../SubjectsCatalog/utils/importSubjectsWorkbook';

const workbookFile = (rows) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Import');
  return {
    name: 'mixed-rows.xlsx',
    buffer: XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }),
  };
};

beforeAll(() => {
  global.FileReader = class {
    readAsArrayBuffer(file) {
      this.result = file.buffer;
      this.onload();
    }
  };
});

test('doctor preview identifies bad rows even when another doctor is valid', async () => {
  const preview = await parseAdminImportFile(workbookFile([
    { doctor_name: 'Dr One', doctor_national_id: '111', subject_code: 'CS101', subject_name: 'Programming', faculty: 'computers-ai' },
    { doctor_name: '', doctor_national_id: '222', subject_code: 'CS102', subject_name: 'Databases', faculty: 'computers-ai' },
  ]));

  expect(preview.groupedDoctors).toHaveLength(1);
  expect(preview.invalidRows).toEqual([expect.objectContaining({ rowNumber: 3 })]);
});

test('student preview identifies bad rows even when another student is valid', async () => {
  const preview = await parseStudentsWorkbook(workbookFile([
    { full_name: 'Student One', student_id: '111', subject_code: 'CS101', type: 'Lecture', group: 'A' },
    { full_name: 'Student Two', student_id: '222', subject_code: 'UNKNOWN', type: 'Lecture', group: 'A' },
  ]), {
    facultyId: 'computers-ai',
    catalogSubjects: [{ facultyId: 'computers-ai', subjectCode: 'CS101', subjectName: 'Programming', types: ['Lecture'], groupsByType: { Lecture: ['A'] } }],
  });

  expect(preview.students).toHaveLength(1);
  expect(preview.invalidRows).toEqual([expect.stringContaining('Row 3')]);
});

test('student preview rejects a login email shared by different students', async () => {
  const preview = await parseStudentsWorkbook(workbookFile([
    { full_name: 'Student One', student_id: '111', national_id: 'national-111', login_email: 'shared@example.test', subject_code: 'CS101', type: 'Lecture', group: 'A' },
    { full_name: 'Student Two', student_id: '222', national_id: 'national-222', login_email: 'shared@example.test', subject_code: 'CS101', type: 'Lecture', group: 'A' },
  ]), {
    facultyId: 'computers-ai',
    catalogSubjects: [{ facultyId: 'computers-ai', subjectCode: 'CS101', subjectName: 'Programming', types: ['Lecture'], groupsByType: { Lecture: ['A'] } }],
  });

  expect(preview.students).toHaveLength(1);
  expect(preview.invalidRows).toEqual([expect.stringContaining('shared@example.test')]);
});

test('catalog preview rejects a misspelled faculty even when another subject is valid', async () => {
  const preview = await parseSubjectsWorkbook(workbookFile([
    { faculty: 'computers-ai', subject_name: 'Programming', subject_code: 'CS101', lecture_group_count: 1 },
    { faculty: 'computer-ai-typo', subject_name: 'Databases', subject_code: 'CS102', lecture_group_count: 1 },
  ]), { selectedFacultyId: 'computers-ai' });

  expect(preview.subjects).toHaveLength(1);
  expect(preview.invalidRows).toEqual([expect.stringContaining('Row 3')]);
});
