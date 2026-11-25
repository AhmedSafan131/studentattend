import * as XLSX from 'xlsx';
import { TEMPLATE_COLLEGES, buildTemplateRegistrationsForStudent } from '../../sharedImportTemplateData';
import {
  COLLEGE_OPTIONS,
  findExistingStudent,
  getCollegeRecord,
  getFacultyRecord,
  normalizeCatalogName,
  normalizeGroup,
  normalizeIdentifier,
  normalizeRegistrationType,
  normalizeRegistrations,
  normalizeStudentRecord,
  normalizeSubjectCode,
} from './studentUtils';

export const ALL_STUDENT_FACULTIES = '__all_faculties__';

export const STUDENT_TEMPLATE_HEADERS = [
  'full_name',
  'student_id',
  'national_id',
  'faculty',
  'subject_code',
  'type',
  'group',
  'login_email',
  'password',
];

const SAMPLE_STUDENT_NAMES = [
  'Ahmed Safan',
  'Mona Hassan',
  'Omar Fathy',
  'Nour Adel',
  'Karim Nabil',
  'Sara Youssef',
  'Hany Ibrahim',
  'Laila Samir',
  'Yara Mostafa',
  'Tarek Mahmoud',
  'Dina Gamal',
  'Mostafa Saeed',
  'Rana Khaled',
  'Heba Farouk',
  'Youssef Amin',
  'Salma Magdy',
  'Amr Hussein',
  'Nada Sherif',
  'Eman Atef',
  'Khaled Ashraf',
  'Mai Sobhy',
  'Hossam Nader',
  'Reem Zakaria',
  'Fady Kamal',
  'Aya Fouad',
  'Walid Sameh',
  'Farida Essam',
  'Sherif Hassan',
  'Noha Abdelrahman',
  'Bassel Adel',
  'Mariam Tamer',
  'Mahmoud Reda',
  'Jana Hesham',
  'Seif Ezz',
  'Rania Lotfy',
  'Yasmine Hamed',
  'Ali Medhat',
  'Malak Nasser',
  'Hussein Galal',
  'Dalia Abdelaziz',
  'Ziad Omar',
  'Hagar Salah',
  'Ayman Samir',
  'Nelly Waleed',
  'Samer Younis',
  'Passant Fawzy',
  'Hazem Raouf',
  'Lobna Nabil',
  'Adham Wael',
  'Menna Ehab',
];

const buildSampleStudentId = (index, facultyIndex) => `2026${String(facultyIndex + 1).padStart(2, '0')}${String(index + 1).padStart(4, '0')}`;

const buildSampleNationalId = (index, facultyIndex) => (
  `30${String(600101 + facultyIndex * 1000 + index).padStart(6, '0')}${String(120000 + index).padStart(6, '0')}`
);

const getSubjectTypeGroups = (subject, type) => {
  const groupsByType = subject?.groupsByType?.[type];
  if (Array.isArray(groupsByType) && groupsByType.length) {
    return groupsByType;
  }

  const count = Number(subject?.groupCounts?.[type]);
  if (count > 0) {
    return Array.from({ length: Math.min(26, count) }, (_, index) => String.fromCharCode(65 + index));
  }

  return subject?.groups?.length ? subject.groups : ['A'];
};

export const buildStudentTemplateRows = ({ facultyId = '', allowedFacultyIds } = {}) => {
  if (!facultyId || facultyId === ALL_STUDENT_FACULTIES) {
    return TEMPLATE_COLLEGES
      .filter((college) => !allowedFacultyIds || allowedFacultyIds.includes(college.facultyId))
      .flatMap((college) => buildStudentTemplateRows({ facultyId: college.facultyId }));
  }
  const college = TEMPLATE_COLLEGES.find((item) => item.facultyId === facultyId);
  if (!college) {
    throw new Error('Choose a valid faculty before downloading the student template.');
  }

  return SAMPLE_STUDENT_NAMES.flatMap((name, index) => {
    const studentId = buildSampleStudentId(index, college.facultyIndex);
    const nationalId = buildSampleNationalId(index, college.facultyIndex);

    return buildTemplateRegistrationsForStudent(college, index).map((registration) => ({
      full_name: name,
      student_id: studentId,
      national_id: nationalId,
      faculty: college.facultyId,
      subject_code: registration.subject_code,
      type: registration.type,
      group: registration.group,
      login_email: `${name.toLowerCase().replace(/\s+/g, '.')}.${facultyId}.${index + 1}@demo.example`,
      password: studentId,
    }));
  });
};

const HEADER_ALIASES = {
  name: ['full_name', 'fullname', 'name', 'student_name'],
  studentId: ['student_id', 'studentid', 'university_id', 'universityid'],
  nationalId: ['national_id', 'nationalid'],
  email: ['login_email', 'loginemail', 'email'],
  password: ['password', 'student_password', 'studentpassword'],
  faculty: ['faculty', 'faculty_code', 'college_code'],
  college: ['college', 'department', 'college_name'],
  registrations: ['registrations', 'subject_groups', 'registered_subjects'],
  subjects: ['subjects', 'subject_codes', 'registeredsubjects'],
  groups: ['groups', 'group', 'subject_groups_list'],
  subjectCode: ['subject_code', 'subjectcode', 'course_code'],
  singleGroup: ['group', 'subject_group'],
  type: ['type', 'class_type', 'subject_type', 'session_type'],
};

const normalizeHeader = (value) => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
);

const getFieldValue = (row, aliases) => {
  const keys = Object.keys(row);

  for (const alias of aliases) {
    const matchedKey = keys.find((key) => normalizeHeader(key) === normalizeHeader(alias));
    if (matchedKey && String(row[matchedKey] || '').trim()) {
      return String(row[matchedKey]).trim();
    }
  }

  return '';
};

const readFileAsArrayBuffer = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read the selected file.'));
  reader.readAsArrayBuffer(file);
});

const splitList = (value) => (
  String(value || '')
    .split(/[;|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
);

const parseRegistrationsFromCombinedColumn = (value) => (
  splitList(value).map((entry) => {
    const [subjectCode, secondPart, thirdPart, fourthPart] = entry.split(':').map((part) => part?.trim() || '');
    const hasExplicitName = Boolean(fourthPart);
    const hasExplicitType = Boolean(thirdPart);

    return {
      subjectCode: normalizeSubjectCode(subjectCode),
      subjectName: '',
      type: normalizeRegistrationType(hasExplicitName ? thirdPart : (hasExplicitType ? secondPart : '')),
      group: normalizeGroup(hasExplicitName ? fourthPart : (hasExplicitType ? thirdPart : secondPart)),
    };
  })
);

const buildRegistrationsFromRow = (row) => {
  const combinedRegistrations = getFieldValue(row, HEADER_ALIASES.registrations);
  if (combinedRegistrations) {
    return normalizeRegistrations(parseRegistrationsFromCombinedColumn(combinedRegistrations));
  }

  const singleSubjectCode = getFieldValue(row, HEADER_ALIASES.subjectCode);
  const singleGroup = getFieldValue(row, HEADER_ALIASES.singleGroup);
  const singleType = getFieldValue(row, HEADER_ALIASES.type);
  if (singleSubjectCode || singleGroup || singleType) {
    return normalizeRegistrations([{
      subjectCode: singleSubjectCode,
      group: singleGroup,
      type: singleType,
    }]);
  }

  const subjects = splitList(getFieldValue(row, HEADER_ALIASES.subjects));
  const groups = splitList(getFieldValue(row, HEADER_ALIASES.groups));

  return normalizeRegistrations(subjects.map((subjectCode, index) => ({
    subjectCode,
    group: groups[index],
  })));
};

const getDefaultCollegeForFaculty = (faculty) => (
  faculty?.colleges?.[0]?.name || ''
);

const titleCase = (value) => (
  String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
);

const deriveStudentName = ({ explicitName, email, studentId, nationalId }, fallbackIndex) => {
  if (explicitName) return explicitName;

  const emailLocalPart = String(email || '').split('@')[0] || '';
  const readableEmailName = emailLocalPart
    .replace(/\d+/g, ' ')
    .replace(/[._-]+/g, ' ')
    .trim();

  if (readableEmailName) {
    return titleCase(readableEmailName);
  }

  return `Student ${studentId || nationalId || fallbackIndex + 1}`;
};

const collegeBelongsToFaculty = (collegeName, faculty) => {
  if (!faculty) return true;

  return faculty.colleges.some((college) => (
    normalizeCatalogName(college.name) === normalizeCatalogName(collegeName)
  ));
};

const validateRow = ({ rowNumber, record, selectedFaculty, catalogSubjectsByCode }) => {
  if (!record.studentId && !record.nationalId) {
    return `Row ${rowNumber}: Student ID or National ID is required.`;
  }

  if (!record.college) {
    return `Row ${rowNumber}: College is required.`;
  }

  if (!getCollegeRecord(record.college)) {
    return `Row ${rowNumber}: College "${record.college}" is not recognized.`;
  }

  if (selectedFaculty && !collegeBelongsToFaculty(record.college, selectedFaculty)) {
    return `Row ${rowNumber}: College "${record.college}" does not belong to ${selectedFaculty.name}.`;
  }

  if (record.registrations.length === 0) {
    return `Row ${rowNumber}: At least one registered subject with a group is required.`;
  }

  const invalidRegistration = record.registrations.find((registration) => (
    !registration.subjectCode || !registration.group || !registration.type
  ));

  if (invalidRegistration) {
    return `Row ${rowNumber}: Invalid registration "${invalidRegistration.subjectCode}:${invalidRegistration.type}:${invalidRegistration.group}".`;
  }

  const missingCatalogRegistration = record.registrations.find((registration) => (
    !catalogSubjectsByCode.has(normalizeSubjectCode(registration.subjectCode))
  ));

  if (missingCatalogRegistration) {
    return `Row ${rowNumber}: Subject code "${missingCatalogRegistration.subjectCode}" is not registered in the selected faculty catalog.`;
  }

  const unavailableRegistration = record.registrations.find((registration) => {
    const subject = catalogSubjectsByCode.get(normalizeSubjectCode(registration.subjectCode));
    const availableTypes = subject?.types?.length ? subject.types : ['Lecture'];
    const availableGroups = getSubjectTypeGroups(subject, registration.type).map(normalizeGroup);

    return !availableTypes.includes(registration.type) || !availableGroups.includes(normalizeGroup(registration.group));
  });

  if (unavailableRegistration) {
    return `Row ${rowNumber}: Type/group "${unavailableRegistration.type}:${unavailableRegistration.group}" is not available for subject "${unavailableRegistration.subjectCode}".`;
  }

  return '';
};

export const parseStudentsWorkbook = async (file, { facultyId = '', catalogSubjects = [], allowedFacultyIds } = {}) => {
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const selectedFaculty = getFacultyRecord(facultyId);
  const defaultCollege = getDefaultCollegeForFaculty(selectedFaculty);

  if (!sheetName) {
    throw new Error('The selected file does not contain any sheets.');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const invalidRows = [];
  const groupedStudents = [];
  const emailOwners = new Map();
  const rejectedStudents = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const explicitName = normalizeIdentifier(getFieldValue(row, HEADER_ALIASES.name));
    const rawCollege = normalizeIdentifier(getFieldValue(row, HEADER_ALIASES.college));
    const facultyCode = getFieldValue(row, HEADER_ALIASES.faculty).toLowerCase();
    const rowFaculty = facultyCode ? getFacultyRecord(facultyCode) : null;
    if (facultyCode && !rowFaculty) {
      invalidRows.push(`Row ${rowNumber}: Faculty code "${facultyCode}" is not recognized.`);
      return;
    }
    const college = rowFaculty ? getDefaultCollegeForFaculty(rowFaculty) : (rawCollege || defaultCollege);
    const rowFacultyId = rowFaculty?.id || getCollegeRecord(college)?.facultyId;
    if (rowFacultyId && allowedFacultyIds && !allowedFacultyIds.includes(rowFacultyId)) {
      invalidRows.push(`Row ${rowNumber}: You do not have permission to import faculty "${rowFacultyId}".`);
      return;
    }
    const catalogSubjectsByCode = new Map(
      catalogSubjects.filter((subject) => subject.facultyId === rowFacultyId)
        .map((subject) => [normalizeSubjectCode(subject.subjectCode), subject]),
    );
    const record = {
      studentId: normalizeIdentifier(getFieldValue(row, HEADER_ALIASES.studentId)),
      nationalId: normalizeIdentifier(getFieldValue(row, HEADER_ALIASES.nationalId)),
      email: normalizeIdentifier(getFieldValue(row, HEADER_ALIASES.email)),
      password: normalizeIdentifier(getFieldValue(row, HEADER_ALIASES.password)),
      college,
      registrations: buildRegistrationsFromRow(row).map((registration) => {
        const catalogSubject = catalogSubjectsByCode.get(normalizeSubjectCode(registration.subjectCode));
        return {
          ...registration,
          subjectName: catalogSubject?.subjectName || '',
        };
      }),
    };

    const isEmptyRow = !explicitName && !record.studentId && !record.nationalId && !record.email && !record.password && !rawCollege && record.registrations.length === 0;
    if (isEmptyRow) {
      return;
    }

    record.name = deriveStudentName({
      explicitName,
      email: record.email,
      studentId: record.studentId,
      nationalId: record.nationalId,
    }, index);

    const validationError = validateRow({ rowNumber, record, selectedFaculty, catalogSubjectsByCode });
    if (validationError) {
      invalidRows.push(validationError);
      return;
    }

    const existing = findExistingStudent(groupedStudents, record);
    if (existing) {
      if (existing.college !== record.college) {
        invalidRows.push(`Row ${rowNumber}: The same student has conflicting faculties.`);
        return;
      }
      existing.registrations = normalizeRegistrations([...existing.registrations, ...record.registrations]);
      if (!existing.name) existing.name = record.name;
      if (!existing.college) existing.college = record.college;
      if (!existing.email) existing.email = record.email || record.nationalId;
      if (!existing.password) existing.password = record.password;
      return;
    }

    const studentKey = `${record.studentId}|${record.nationalId}`;
    const loginEmail = String(record.email || record.nationalId).trim().toLowerCase();
    const emailOwner = emailOwners.get(loginEmail);
    if (emailOwner) {
      if (!rejectedStudents.has(studentKey)) {
        invalidRows.push(
          `Row ${rowNumber}: Login email "${record.email || record.nationalId}" is already assigned to student "${emailOwner}" in this sheet.`,
        );
        rejectedStudents.add(studentKey);
      }
      return;
    }

    groupedStudents.push(normalizeStudentRecord({
      id: `preview-${rowNumber}`,
      name: record.name,
      studentId: record.studentId,
      nationalId: record.nationalId,
      email: record.email || record.nationalId,
      password: record.password,
      college: record.college,
      registrations: record.registrations,
    }, index));
    emailOwners.set(loginEmail, record.studentId || record.nationalId);
  });

  return {
    fileName: file.name,
    sheetName,
    facultyId: selectedFaculty?.id || '',
    facultyName: selectedFaculty?.name || '',
    students: groupedStudents,
    invalidRows,
    rowsParsed: rows.length,
    collegesFound: [...new Set(groupedStudents.map((student) => student.college))].filter((college) => (
      COLLEGE_OPTIONS.some((option) => option.value === college)
    )),
  };
};

export const parseStudentsWorkbooks = async (files, { facultyId = '', catalogSubjects = [], allowedFacultyIds } = {}) => {
  const selectedFaculty = getFacultyRecord(facultyId);
  const fileList = Array.from(files || []);

  if (!selectedFaculty && facultyId !== ALL_STUDENT_FACULTIES) {
    throw new Error('Choose a faculty before uploading student sheets.');
  }

  if (fileList.length === 0) {
    throw new Error('Choose at least one CSV or Excel file.');
  }

  const parsedFiles = [];
  const groupedStudents = [];
  const invalidRows = [];

  for (const file of fileList) {
    const parsed = await parseStudentsWorkbook(file, { facultyId, catalogSubjects, allowedFacultyIds });
    parsedFiles.push({
      fileName: parsed.fileName,
      sheetName: parsed.sheetName,
      rowsParsed: parsed.rowsParsed,
      studentsParsed: parsed.students.length,
      invalidRows: parsed.invalidRows.length,
    });

    parsed.invalidRows.forEach((issue) => {
      invalidRows.push(`${parsed.fileName}: ${issue}`);
    });

    parsed.students.forEach((student) => {
      const existing = findExistingStudent(groupedStudents, student);
      if (existing) {
        if (existing.college !== student.college) {
          invalidRows.push(`${parsed.fileName}: Student "${student.studentId || student.nationalId}" has conflicting faculties.`);
          return;
        }
        existing.registrations = normalizeRegistrations([...existing.registrations, ...student.registrations]);
        if (!existing.name) existing.name = student.name;
        if (!existing.college) existing.college = student.college;
        if (!existing.email) existing.email = student.email || student.nationalId;
        if (!existing.password) existing.password = student.password;
        return;
      }

      const loginEmail = String(student.email || student.nationalId).trim().toLowerCase();
      const emailOwner = groupedStudents.find((candidate) => (
        String(candidate.email || candidate.nationalId).trim().toLowerCase() === loginEmail
      ));
      if (emailOwner) {
        invalidRows.push(
          `${parsed.fileName}: Login email "${student.email || student.nationalId}" is already assigned to student "${emailOwner.studentId || emailOwner.nationalId}".`,
        );
        return;
      }

      groupedStudents.push(student);
    });
  }

  return {
    fileName: fileList.map((file) => file.name).join(', '),
    sheetName: fileList.length === 1 ? parsedFiles[0]?.sheetName || '' : `${fileList.length} files`,
    facultyId: selectedFaculty?.id || ALL_STUDENT_FACULTIES,
    facultyName: selectedFaculty?.name || '',
    files: parsedFiles,
    students: groupedStudents,
    invalidRows,
    rowsParsed: parsedFiles.reduce((total, file) => total + file.rowsParsed, 0),
    collegesFound: [...new Set(groupedStudents.map((student) => student.college))].filter((college) => (
      COLLEGE_OPTIONS.some((option) => option.value === college)
    )),
  };
};

export const downloadStudentsTemplate = ({ facultyId = '', allowedFacultyIds } = {}) => {
  const selectedFaculty = getFacultyRecord(facultyId);
  const rows = buildStudentTemplateRows({ facultyId, allowedFacultyIds });
  const fileSuffix = selectedFaculty ? `-${selectedFaculty.id}` : '-all-faculties';

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: STUDENT_TEMPLATE_HEADERS });
  worksheet['!cols'] = STUDENT_TEMPLATE_HEADERS.map((header) => ({
    wch: Math.max(header.length, ...rows.map((row) => String(row[header] || '').length)) + 2,
  }));
  worksheet['!autofilter'] = { ref: worksheet['!ref'] };

  const instructions = XLSX.utils.aoa_to_sheet([
    ['Student import instructions'],
    ['Column', 'Required', 'Accepted value'],
    ['full_name', 'Yes', 'Student full name'],
    ['student_id', 'Student ID or National ID is required', 'University student number'],
    ['national_id', 'Student ID or National ID is required', 'National identification number'],
    ['faculty', 'Yes', 'Faculty code, for example engineering or computers-ai. See FacultyCodes sheet.'],
    ['subject_code', 'Yes', 'Must already exist in the selected faculty subject catalog'],
    ['type', 'Yes', 'Lecture, Section, or Practical; it must be enabled for the subject'],
    ['group', 'Yes', 'A-Z; it must exist for the selected subject and type'],
    ['login_email', 'Optional', 'If empty, the system creates the login identifier automatically'],
    ['password', 'Optional', 'If empty, the Student ID is used as the initial password'],
    [],
    ['Repeat the same student on multiple rows to register more subjects or types.'],
    ['These are demo registrations matching the subjects and doctors templates. Import subjects first.'],
    ['Importing adds new students and updates listed students and their registrations for the current term only. Students missing from the sheet and previous terms remain unchanged.'],
    ['Choose All faculties to upload a sheet containing multiple faculties. Do not rename columns.'],
  ]);
  instructions['!cols'] = [{ wch: 24 }, { wch: 42 }, { wch: 80 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');
  const codes = XLSX.utils.json_to_sheet(TEMPLATE_COLLEGES
    .filter((college) => (!selectedFaculty || college.facultyId === selectedFaculty.id)
      && (!allowedFacultyIds || allowedFacultyIds.includes(college.facultyId)))
    .map((college) => ({ faculty: college.facultyId, faculty_name: getFacultyRecord(college.facultyId)?.name })));
  codes['!cols'] = [{ wch: 30 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(workbook, codes, 'FacultyCodes');
  XLSX.writeFile(workbook, `students-import-template${fileSuffix}.xlsx`);
};
