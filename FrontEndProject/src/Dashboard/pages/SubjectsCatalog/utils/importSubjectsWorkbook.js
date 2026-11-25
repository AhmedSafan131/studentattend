import * as XLSX from 'xlsx';
import { FACULTY_CATALOG } from '../../../../utils/constants';
import { buildTemplateSubjectCatalog } from '../../sharedImportTemplateData';

export const ALL_FACULTIES_OPTION = '__all_faculties__';

export const SUBJECT_TEMPLATE_HEADERS = [
  'faculty',
  'subject_name',
  'subject_code',
  'lecture_group_count',
  'section_group_count',
  'practical_group_count',
];

const HEADER_ALIASES = {
  groupCount: ['groupcount', 'group_count', 'groupscount', 'groups_count', 'numberofgroups', 'number_of_groups', 'عدد الجروبات', 'عدد المجموعات'],
  lectureGroupCount: ['lecturegroupcount', 'lecture_group_count', 'lecturegroups', 'lecture_groups', 'عدد مجموعات المحاضرة', 'عدد جروبات المحاضرة'],
  sectionGroupCount: ['sectiongroupcount', 'section_group_count', 'sectiongroups', 'section_groups', 'عدد مجموعات السكشن', 'عدد جروبات السكشن'],
  practicalGroupCount: ['practicalgroupcount', 'practical_group_count', 'practicalgroups', 'practical_groups', 'عدد مجموعات العملي', 'عدد جروبات العملي'],
  types: ['types', 'type', 'lecturetypes', 'lecture_types', 'نوع المادة', 'النوع'],
  subjectName: ['subjectname', 'subject_name', 'name', 'course_name', 'course', 'subject', 'اسم المادة', 'المادة', 'اسم المقرر'],
  subjectCode: ['subjectcode', 'subject_code', 'code', 'coursecode', 'course_code', 'كود المادة', 'كود المقرر', 'رمز المادة'],
  originalSubjectCode: ['originalsubjectcode', 'original_subject_code', 'oldsubjectcode', 'old_subject_code', 'الكود القديم', 'كود المادة القديم'],
  faculty: ['faculty', 'facultyname', 'college', 'الكلية', 'اسم الكلية'],
};

const ALLOWED_TYPES = ['Lecture', 'Section', 'Practical'];

const normalizeTypes = (value) => {
  const lookup = new Map(ALLOWED_TYPES.map((type) => [type.toLowerCase(), type]));
  return [...new Set(
    String(value || '')
      .split(/[,;|/]+/)
      .map((type) => lookup.get(type.trim().toLowerCase()))
      .filter(Boolean),
  )];
};

const normalizeLookup = (value) => String(value || '').trim().toLowerCase();
const normalizeHeader = (value) => normalizeLookup(value).replace(/[\s_-]+/g, '');

const FACULTY_ALIASES = {
  engineering: ['كلية الهندسة', 'الهندسة', 'faculty of engineering', 'engineering'],
  'computers-ai': ['كلية الحاسبات والذكاء الاصطناعي', 'الحاسبات', 'حاسبات', 'faculty of computers and artificial intelligence', 'computer science', 'computers and ai'],
  nursing: ['كلية التمريض', 'التمريض', 'faculty of nursing', 'nursing'],
  medicine: ['كلية الطب البشري', 'الطب البشري', 'كلية الطب', 'faculty of human medicine', 'faculty of medicine', 'medicine'],
  pharmacy: ['كلية الصيدلة', 'الصيدلة', 'faculty of pharmacy', 'pharmacy'],
  humanities: ['علوم انسانية', 'العلوم الانسانية', 'humanities', 'human sciences'],
  'health-sciences-technology': ['تكنولوجيا العلوم الصحية', 'health sciences technology'],
  dentistry: ['كلية طب الاسنان', 'طب الاسنان', 'faculty of dentistry', 'dentistry'],
  'veterinary-medicine': ['كلية الطب البيطري', 'الطب البيطري', 'faculty of veterinary medicine', 'veterinary medicine'],
  'physical-therapy': ['كلية العلاج الطبيعي', 'العلاج الطبيعي', 'faculty of physical therapy', 'physical therapy'],
};

const FACULTY_MATCHERS = FACULTY_CATALOG.map((faculty) => ({
  id: faculty.id,
  name: faculty.name,
  tokens: new Set(
    [
      faculty.id,
      faculty.name,
      ...(FACULTY_ALIASES[faculty.id] || []),
      ...faculty.colleges.flatMap((college) => [college.id, college.name]),
    ].map(normalizeLookup).filter(Boolean),
  ),
}));

const resolveFacultyId = (value) => {
  const normalizedValue = normalizeLookup(value);

  if (!normalizedValue) {
    return '';
  }

  return FACULTY_MATCHERS.find((faculty) => faculty.tokens.has(normalizedValue))?.id || '';
};

const getFieldValue = (row, aliases) => {
  const keys = Object.keys(row || {});

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

export const parseSubjectsWorkbook = async (file, { selectedFacultyId = ALL_FACULTIES_OPTION } = {}) => {
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('The selected file does not contain any sheets.');
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  const invalidRows = [];
  const groupedSubjects = new Map();

  rows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const subjectName = getFieldValue(rawRow, HEADER_ALIASES.subjectName);
    const subjectCode = getFieldValue(rawRow, HEADER_ALIASES.subjectCode).toUpperCase();
    const originalSubjectCode = getFieldValue(rawRow, HEADER_ALIASES.originalSubjectCode).toUpperCase();
    const rowFacultyValue = getFieldValue(rawRow, HEADER_ALIASES.faculty);
    const groupCount = Number.parseInt(getFieldValue(rawRow, HEADER_ALIASES.groupCount), 10);
    const explicitCounts = {
      Lecture: Number.parseInt(getFieldValue(rawRow, HEADER_ALIASES.lectureGroupCount), 10),
      Section: Number.parseInt(getFieldValue(rawRow, HEADER_ALIASES.sectionGroupCount), 10),
      Practical: Number.parseInt(getFieldValue(rawRow, HEADER_ALIASES.practicalGroupCount), 10),
    };
    const hasExplicitCounts = Object.values(explicitCounts).some(Number.isInteger);
    const listedTypes = normalizeTypes(getFieldValue(rawRow, HEADER_ALIASES.types));
    const types = hasExplicitCounts
      ? ALLOWED_TYPES.filter((type) => Number.isInteger(explicitCounts[type]) && explicitCounts[type] > 0)
      : listedTypes;
    const groupCounts = Object.fromEntries(ALLOWED_TYPES.map((type) => [
      type,
      hasExplicitCounts ? (Number.isInteger(explicitCounts[type]) ? explicitCounts[type] : 0) : (types.includes(type) ? groupCount : 0),
    ]));
    const resolvedGroupCount = hasExplicitCounts ? Math.max(0, ...Object.values(groupCounts)) : groupCount;
    const rowFacultyId = resolveFacultyId(rowFacultyValue);
    const isEmpty = !subjectName && !subjectCode && !rowFacultyValue && !Number.isInteger(resolvedGroupCount) && !types.length;

    if (isEmpty) {
      return;
    }

    if (!subjectName || !subjectCode || !Number.isInteger(resolvedGroupCount) || resolvedGroupCount < 1 || resolvedGroupCount > 26 || !types.length || Object.values(groupCounts).some((count) => count < 0 || count > 26)) {
      invalidRows.push(`Row ${rowNumber}: subject name, code, and at least one type group count from 1 to 26 are required.`);
      return;
    }

    const facultyId = selectedFacultyId !== ALL_FACULTIES_OPTION ? selectedFacultyId : rowFacultyId;

    if (!facultyId) {
      invalidRows.push(`Row ${rowNumber}: faculty is required when importing all faculties.`);
      return;
    }

    if (
      selectedFacultyId !== ALL_FACULTIES_OPTION
      && rowFacultyValue
      && rowFacultyId !== selectedFacultyId
    ) {
      invalidRows.push(`Row ${rowNumber}: row faculty does not match the selected faculty.`);
      return;
    }

    if (selectedFacultyId === ALL_FACULTIES_OPTION && rowFacultyValue && !rowFacultyId) {
      invalidRows.push(`Row ${rowNumber}: faculty "${rowFacultyValue}" is not recognized.`);
      return;
    }

    const subjectKey = `${facultyId}__${subjectCode}`;
    const existing = groupedSubjects.get(subjectKey);
    groupedSubjects.set(subjectKey, {
      subjectName,
      subjectCode,
      originalSubjectCode,
      facultyId,
      faculty: rowFacultyValue,
      groupCount: Math.max(existing?.groupCount || 0, resolvedGroupCount),
      groupCounts: Object.fromEntries(ALLOWED_TYPES.map((type) => [type, Math.max(existing?.groupCounts?.[type] || 0, groupCounts[type] || 0)])),
      types: [...new Set([...(existing?.types || []), ...types])],
    });
  });

  return {
    fileName: file.name,
    sheetName,
    rowsParsed: rows.length,
    subjects: [...groupedSubjects.values()],
    invalidRows,
  };
};

export const buildSubjectTemplateRows = ({ selectedFacultyId = ALL_FACULTIES_OPTION } = {}) => (
  buildTemplateSubjectCatalog(selectedFacultyId === ALL_FACULTIES_OPTION ? '' : selectedFacultyId)
    .map((subject) => ({
      faculty: subject.facultyId,
      subject_name: subject.subjectName,
      subject_code: subject.subjectCode,
      lecture_group_count: subject.groupCounts.Lecture,
      section_group_count: subject.groupCounts.Section,
      practical_group_count: subject.groupCounts.Practical,
    }))
);

export const downloadSubjectsTemplate = ({ selectedFacultyId = ALL_FACULTIES_OPTION } = {}) => {
  const rows = buildSubjectTemplateRows({ selectedFacultyId });
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: SUBJECT_TEMPLATE_HEADERS,
  });

  worksheet['!cols'] = [
    { wch: 22 },
    { wch: 32 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 24 },
  ];
  worksheet['!autofilter'] = { ref: worksheet['!ref'] };

  const instructions = XLSX.utils.aoa_to_sheet([
    ['Subjects catalog import instructions'],
    ['Column', 'Required', 'Accepted value'],
    ['faculty', 'Yes when importing All faculties', 'Faculty code, for example computers-ai or engineering'],
    ['subject_name', 'Yes', 'The subject name shown to users'],
    ['subject_code', 'Yes', 'A unique subject code in the selected faculty and term'],
    ['lecture_group_count', 'At least one type must be greater than 0', '0 to disable Lecture, or 1-26 groups'],
    ['section_group_count', 'At least one type must be greater than 0', '0 to disable Section, or 1-26 groups'],
    ['practical_group_count', 'At least one type must be greater than 0', '0 to disable Practical, or 1-26 groups'],
    [],
    ['The academic term is taken from the term selected in the dashboard; do not add a term column.'],
    ['These are matching demo rows for the doctors and students templates. Import this sheet before the student sheet.'],
    ['Do not rename the columns. Review demo data before importing into a real term.'],
  ]);
  instructions['!cols'] = [{ wch: 30 }, { wch: 42 }, { wch: 78 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'SubjectsCatalog');
  XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');
  XLSX.writeFile(workbook, `subjects-catalog-template-${selectedFacultyId === ALL_FACULTIES_OPTION ? 'all-faculties' : selectedFacultyId}.xlsx`);
};

export const exportSubjectsWorkbook = (subjects = [], { facultyId = '', termCode = '' } = {}) => {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    throw new Error('There are no catalog subjects to export.');
  }

  const rows = subjects.map((subject) => ({
    subject_name: subject.subjectName || '',
    subject_code: subject.subjectCode || '',
    faculty: subject.facultyId || subject.facultyName || '',
    lecture_group_count: Number(subject.groupCounts?.Lecture) || 0,
    section_group_count: Number(subject.groupCounts?.Section) || 0,
    practical_group_count: Number(subject.groupCounts?.Practical) || 0,
    types: (subject.types || []).join(', '),
    term_code: subject.termCode || termCode || '',
  }));
  const headers = [
    'subject_name', 'subject_code', 'faculty', 'lecture_group_count',
    'section_group_count', 'practical_group_count', 'types', 'term_code',
  ];
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  worksheet['!cols'] = headers.map((header) => ({
    wch: Math.max(header.length, ...rows.map((row) => String(row[header] || '').length)) + 2,
  }));
  worksheet['!autofilter'] = { ref: worksheet['!ref'] };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'SubjectsCatalog');

  const safeScope = String(facultyId || 'all-faculties').replace(/[^a-zA-Z0-9_-]+/g, '-');
  const safeTerm = String(termCode || 'current-term').replace(/[^a-zA-Z0-9_-]+/g, '-');
  XLSX.writeFile(workbook, `subjects-catalog-${safeScope}-${safeTerm}.xlsx`);
};
