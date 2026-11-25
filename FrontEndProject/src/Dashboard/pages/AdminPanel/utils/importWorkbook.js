import * as XLSX from 'xlsx';
import { buildTemplateTeachingAssignments } from '../../sharedImportTemplateData';
import {
  DEFAULT_IMPORTED_PASSWORD,
  buildAssignmentFromInput,
  isSameAssignment,
} from './adminPanelUtils';

export const DOCTOR_TEMPLATE_HEADERS = [
  'doctor_name',
  'doctor_national_id',
  'doctor_email',
  'doctor_password',
  'subject_code',
  'subject_name',
  'subject_type',
  'faculty',
];

const SAMPLE_DOCTOR_NAMES = [
  'Ahmed Ali',
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

const slugifyName = (name) => (
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
);

export const buildImportSampleRows = ({ facultyId = '' } = {}) => (
  buildTemplateTeachingAssignments()
    .filter((assignment) => !facultyId || assignment.facultyId === facultyId)
    .map((assignment) => {
    const doctorIndex = assignment.subjectIndex % SAMPLE_DOCTOR_NAMES.length;
    // Keep these identities stable in both combined and single-faculty downloads.
    const isSharedDoctor = doctorIndex < 2 && ['engineering', 'computers-ai'].includes(assignment.facultyId);
    const identityFacultyIndex = isSharedDoctor ? 0 : assignment.facultyIndex;
    const identityFacultyId = isSharedDoctor ? 'engineering' : assignment.facultyId;
    const name = SAMPLE_DOCTOR_NAMES[doctorIndex];
    const doctorName = `Dr. ${name}`;
    const email = `${slugifyName(name)}.${identityFacultyId}@demo.example`;
    return {
      doctor_name: doctorName,
      doctor_national_id: `29${String(800101 + identityFacultyIndex * 1000 + doctorIndex).padStart(6, '0')}${String(110000 + doctorIndex).padStart(6, '0')}`,
      doctor_email: email,
      doctor_password: DEFAULT_IMPORTED_PASSWORD,
      subject_code: assignment.code,
      subject_name: assignment.name,
      subject_type: assignment.type,
      faculty: assignment.faculty,
    };
    })
);

const HEADER_ALIASES = {
  name: ['doctorname', 'doctor_name', 'name', 'full_name', 'doctor'],
  nationalId: ['doctornationalid', 'doctor_national_id', 'nationalid', 'national_id'],
  email: ['doctoremail', 'doctor_email', 'email', 'mail'],
  password: ['doctorpassword', 'doctor_password', 'password'],
  specialty: ['doctorspecialty', 'doctor_specialty', 'specialty'],
  courseCode: ['subjectcode', 'subject_code', 'coursecode', 'course_code', 'code'],
  courseName: ['subjectname', 'subject_name', 'coursename', 'course_name'],
  type: ['subjecttype', 'subject_type', 'coursetype', 'course_type', 'type'],
  faculty: ['faculty', 'facultyname'],
  college: ['department', 'departmentname', 'college', 'college_name'],
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

const buildFallbackDoctorEmail = ({ nationalId, name }) => {
  if (String(nationalId || '').trim()) {
    return `staff.${String(nationalId).trim()}@import.local`;
  }

  const slug = slugifyName(name);
  if (slug) {
    return `${slug}@import.local`;
  }

  return '';
};

const normalizeRow = (row) => ({
  name: getFieldValue(row, HEADER_ALIASES.name),
  nationalId: getFieldValue(row, HEADER_ALIASES.nationalId),
  email: getFieldValue(row, HEADER_ALIASES.email),
  password: getFieldValue(row, HEADER_ALIASES.password),
  specialty: getFieldValue(row, HEADER_ALIASES.specialty),
  courseCode: getFieldValue(row, HEADER_ALIASES.courseCode),
  courseName: getFieldValue(row, HEADER_ALIASES.courseName),
  type: getFieldValue(row, HEADER_ALIASES.type),
  faculty: getFieldValue(row, HEADER_ALIASES.faculty),
  college: getFieldValue(row, HEADER_ALIASES.college),
});

export const parseAdminImportFile = async (file, { facultyId = '', students = [] } = {}) => {
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('The selected file does not contain any sheets.');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const invalidRows = [];
  const groupedDoctors = new Map();
  const doctorKeysByEmail = new Map();
  const doctorKeysByNationalId = new Map();

  rows.forEach((rawRow, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const row = normalizeRow(rawRow);
    const isCompletelyEmpty = Object.values(row).every((value) => !String(value || '').trim());

    if (isCompletelyEmpty) {
      return;
    }

    if (!row.name || (!row.email && !row.nationalId)) {
      invalidRows.push({
        rowNumber,
        message: 'Doctor name and either doctor email or national ID are required.',
      });
      return;
    }

    const normalizedEmail = String(row.email || '').trim().toLowerCase();
    const normalizedNationalId = String(row.nationalId || '').trim().toLowerCase();
    const key = doctorKeysByNationalId.get(normalizedNationalId)
      || doctorKeysByEmail.get(normalizedEmail)
      || String(row.nationalId || row.email).trim().toLowerCase();
    const currentDoctor = groupedDoctors.get(key) || {
      name: row.name,
      nationalId: row.nationalId,
      email: row.email || buildFallbackDoctorEmail(row),
      password: row.password || DEFAULT_IMPORTED_PASSWORD,
      specialty: row.specialty || '--',
      assignments: [],
    };

    currentDoctor.nationalId = currentDoctor.nationalId || row.nationalId;
    currentDoctor.email = currentDoctor.email || row.email || buildFallbackDoctorEmail(row);
    currentDoctor.password = currentDoctor.password || row.password || DEFAULT_IMPORTED_PASSWORD;
    currentDoctor.name = currentDoctor.name || row.name;

    if (normalizedEmail) {
      doctorKeysByEmail.set(normalizedEmail, key);
    }

    if (normalizedNationalId) {
      doctorKeysByNationalId.set(normalizedNationalId, key);
    }

    if (row.courseCode) {
      const assignmentResult = buildAssignmentFromInput({
        courseCode: row.courseCode,
        courseName: row.courseName,
        faculty: row.faculty || facultyId,
        college: row.college,
        type: row.type,
      }, students);

      if (assignmentResult.error) {
        invalidRows.push({
          rowNumber,
          message: assignmentResult.error,
        });
        groupedDoctors.set(key, currentDoctor);
        return;
      }

      const exists = currentDoctor.assignments.some((assignment) => (
        isSameAssignment(assignment, assignmentResult.assignment)
      ));

      if (!exists) {
        currentDoctor.assignments.push(assignmentResult.assignment);
      }
    }

    groupedDoctors.set(key, currentDoctor);
  });

  return {
    sheetName,
    facultyId,
    rowCount: rows.length,
    groupedDoctors: [...groupedDoctors.values()],
    invalidRows,
  };
};

export const downloadAdminImportTemplate = ({ facultyId = '' } = {}) => {
  const sampleRows = buildImportSampleRows({ facultyId });
  const worksheet = XLSX.utils.json_to_sheet(sampleRows, {
    header: DOCTOR_TEMPLATE_HEADERS,
  });
  worksheet['!cols'] = DOCTOR_TEMPLATE_HEADERS.map((header) => ({
    wch: Math.max(header.length, ...sampleRows.map((row) => String(row[header] || '').length)) + 2,
  }));
  worksheet['!autofilter'] = { ref: worksheet['!ref'] };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DoctorsImport');
  const instructions = XLSX.utils.aoa_to_sheet([
    ['Doctors import demo template'],
    ['These subject codes and names match the Subjects Catalog and Students demo templates.'],
    ['Import the Subjects Catalog sheet first, then the Students sheet, then review and import this Doctors sheet.'],
    ['Every subject has Lecture, Section, and Practical assignments matching the demo catalog.'],
    ['The faculty column uses the faculty code. No department or doctor_specialty column is needed.'],
    ['faculty identifies the faculty of the subject on that row. Repeat the same doctor national ID across rows to assign subjects in multiple faculties.'],
    ['The all-faculties template includes Dr. Ahmed Ali and Dr. Mona Hassan teaching in both engineering and computers-ai, using the same national ID and email across both faculties.'],
    ['Review demo data before importing into a real term.'],
  ]);
  instructions['!cols'] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');
  XLSX.writeFile(workbook, `admin-doctors-import-template-${facultyId || 'all-faculties'}.xlsx`);
};
