import { FACULTY_CATALOG } from '../../../../utils/constants';

export const PAGE_SIZE_OPTIONS = [6, 8, 12, 20];
export const DEFAULT_PAGE_SIZE = 8;
export const REGISTRATION_TYPE_OPTIONS = [
  { value: 'Lecture', label: 'Lecture' },
  { value: 'Section', label: 'Section' },
  { value: 'Practical', label: 'Practical' },
];

const COLLEGE_RECORDS = FACULTY_CATALOG.flatMap((faculty) => (
  faculty.colleges.map((college) => ({
    id: college.id,
    name: college.name,
    facultyId: faculty.id,
    facultyName: faculty.name,
    courses: college.courses,
  }))
));

const COLLEGE_ALIASES_BY_ID = {
  engineering: [
    'Faculty of Engineering',
    'Engineering',
    'Electrical Engineering',
    'Mechanical Engineering',
    'كلية الهندسة',
    'كليه الهندسه',
  ],
  'computers-ai': [
    'Computer Science & Engineering',
    'Computer Science',
    'Faculty of Computers and Artificial Intelligence',
    'كلية الحاسبات والذكاء الاصطناعي',
    'كليه الحاسبات والذكاء الاصطناعي',
  ],
  nursing: [
    'Faculty of Nursing',
    'كلية التمريض',
    'كليه التمريض',
  ],
  medicine: [
    'Faculty of Human Medicine',
    'General Medicine',
    'Faculty of Medicine',
    'كلية الطب البشري',
    'كليه الطب البشري',
  ],
  pharmacy: [
    'Faculty of Pharmacy',
    'كلية الصيدلة',
    'كليه الصيدله',
  ],
  humanities: [
    'Humanities',
    'Human Sciences',
    'علوم انسانية',
    'علوم إنسانية',
  ],
  'health-sciences-technology': [
    'Health Sciences Technology',
    'تكنولوجيا العلوم الصحية',
  ],
  dentistry: [
    'Faculty of Dentistry',
    'كلية طب الاسنان',
    'كلية طب الأسنان',
  ],
  'veterinary-medicine': [
    'Faculty of Veterinary Medicine',
    'كلية الطب البيطري',
  ],
  'physical-therapy': [
    'Faculty of Physical Therapy',
    'كلية العلاج الطبيعي',
  ],
};

export const COLLEGE_OPTIONS = COLLEGE_RECORDS.map((college) => ({
  value: college.name,
  label: college.name,
  labelKey: `college_${college.id}`,
  facultyId: college.facultyId,
}));

export const FACULTY_OPTIONS = FACULTY_CATALOG.map((faculty) => ({
  value: faculty.id,
  label: faculty.name,
  labelKey: `faculty_${faculty.id}`,
}));

export const createAvatarLabel = (name) => (
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'ST'
);

export const createStudentInternalId = () => `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const normalizeIdentifier = (value) => String(value || '').trim();
export const normalizeSubjectCode = (value) => String(value || '').trim().toUpperCase();
export const normalizeGroup = (value) => String(value || '').trim().toUpperCase();
export const normalizeCatalogName = (value) => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/\s+/g, ' ')
);
const COLLEGE_LOOKUP_MAP = (() => {
  const lookup = new Map();

  COLLEGE_RECORDS.forEach((college) => {
    [
      college.name,
      college.id,
      college.facultyName,
      college.facultyId,
      ...(COLLEGE_ALIASES_BY_ID[college.id] || []),
    ].forEach((alias) => {
      const normalizedAlias = normalizeCatalogName(alias);
      if (normalizedAlias && !lookup.has(normalizedAlias)) {
        lookup.set(normalizedAlias, college);
      }
    });
  });

  return lookup;
})();

export const normalizeRegistrationType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (!normalized) {
    return 'Lecture';
  }

  if (normalized === 'lecture') return 'Lecture';
  if (normalized === 'section') return 'Section';
  if (normalized === 'practical' || normalized === 'lab') return 'Practical';

  return '';
};

export const getCollegeRecord = (collegeName) => (
  COLLEGE_LOOKUP_MAP.get(normalizeCatalogName(collegeName)) || null
);

export const getFacultyRecord = (facultyId) => (
  FACULTY_CATALOG.find((faculty) => faculty.id === facultyId) || null
);

export const getFacultyCollegeNames = (facultyId) => (
  getFacultyRecord(facultyId)?.colleges?.map((college) => college.name) || []
);

export const getFacultyCollegeScopeNames = (facultyId) => {
  const faculty = getFacultyRecord(facultyId);

  if (!faculty) {
    return [];
  }

  return faculty.colleges.flatMap((college) => ([
    college.name,
    college.id,
    ...(COLLEGE_ALIASES_BY_ID[college.id] || []),
  ]));
};

export const getFacultyOptionsForColleges = (allowedColleges = []) => {
  if (!allowedColleges.length) {
    return FACULTY_OPTIONS;
  }

  const allowedSet = new Set(allowedColleges.map((college) => normalizeCatalogName(college)));

  return FACULTY_CATALOG
    .filter((faculty) => faculty.colleges.some((college) => allowedSet.has(normalizeCatalogName(college.name))))
    .map((faculty) => ({
      value: faculty.id,
      label: faculty.name,
      labelKey: `faculty_${faculty.id}`,
    }));
};

const getCollegeScopeKey = (collegeValue) => {
  const collegeRecord = getCollegeRecord(collegeValue);
  return collegeRecord ? normalizeCatalogName(collegeRecord.name) : normalizeCatalogName(collegeValue);
};

const buildDerivedCollegeSubjectsMap = (students = []) => {
  const colleges = new Map();

  (students || []).forEach((student) => {
    const normalizedCollege = getCollegeScopeKey(student?.college);
    const collegeRecord = getCollegeRecord(student?.college);

    if (!normalizedCollege || !collegeRecord) {
      return;
    }

    const subjectMap = colleges.get(normalizedCollege) || new Map();

    normalizeRegistrations(student?.registrations || []).forEach((registration) => {
      const subjectCode = normalizeSubjectCode(registration.subjectCode);
      if (!subjectCode) {
        return;
      }

      const current = subjectMap.get(subjectCode) || {
        subjectCode,
        subjectName: '',
        groups: new Set(),
        types: new Set(),
        groupsByType: new Map(),
        facultyId: collegeRecord.facultyId,
        collegeId: collegeRecord.id,
        collegeName: collegeRecord.name,
      };

      current.subjectName = current.subjectName || normalizeIdentifier(registration.subjectName);

      if (registration.group) {
        current.groups.add(normalizeGroup(registration.group));
        const typeGroups = current.groupsByType.get(registration.type) || new Set();
        typeGroups.add(normalizeGroup(registration.group));
        current.groupsByType.set(registration.type, typeGroups);
      }

      current.types.add(registration.type);

      subjectMap.set(subjectCode, current);
    });

    if (subjectMap.size) {
      colleges.set(normalizedCollege, subjectMap);
    }
  });

  return colleges;
};

export const getFacultySubjectOptionsFromStudents = (facultyId, students = []) => {
  const derivedMap = buildDerivedCollegeSubjectsMap(students);
  const faculty = getFacultyRecord(facultyId);

  if (!faculty) {
    return [];
  }

  const options = faculty.colleges.flatMap((college) => {
    const subjectMap = derivedMap.get(getCollegeScopeKey(college.name));

    return subjectMap
      ? [...subjectMap.values()].map((subject) => ({
          value: `${faculty.id}__${college.id}__${subject.subjectCode}`,
          label: `${subject.subjectName || subject.subjectCode} (${subject.subjectCode})`,
          courseCode: subject.subjectCode,
          courseName: subject.subjectName || subject.subjectCode,
          faculty: faculty.id,
          college: college.id,
          collegeName: college.name,
          groups: [...subject.groups].sort(),
          types: [...subject.types],
          groupsByType: Object.fromEntries(
            [...subject.groupsByType].map(([type, groups]) => [type, [...groups].sort()]),
          ),
          dataset: {
            courseCode: subject.subjectCode,
            courseName: subject.subjectName || subject.subjectCode,
            faculty: faculty.id,
            college: college.id,
          },
        }))
      : [];
  });

  return options.sort((left, right) => left.courseCode.localeCompare(right.courseCode));
};

export const getSubjectOptionsForCollege = (collegeName, students = [], catalogSubjects = []) => {
  const derivedMap = buildDerivedCollegeSubjectsMap(students);
  const subjectMap = new Map();

  (catalogSubjects || []).forEach((subject) => {
    const subjectCode = normalizeSubjectCode(subject.subjectCode);
    if (!subjectCode || subjectCode === '.') return;

    subjectMap.set(subjectCode, {
      ...subject,
      subjectCode,
      subjectName: normalizeIdentifier(subject.subjectName) || subjectCode,
    });
  });

  [...(derivedMap.get(getCollegeScopeKey(collegeName))?.values() || [])].forEach((subject) => {
    const subjectCode = normalizeSubjectCode(subject.subjectCode);
    if (!subjectCode || subjectCode === '.' || subjectMap.has(subjectCode)) return;
    subjectMap.set(subjectCode, subject);
  });

  return [...subjectMap.values()]
    .sort((left, right) => (left.subjectName || left.subjectCode).localeCompare(right.subjectName || right.subjectCode))
    .map((subject) => ({
      value: subject.subjectCode,
      label: subject.subjectName || subject.subjectCode,
      dataset: {
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName || subject.subjectCode,
      },
    }));
};

export const getGroupOptionsForSubject = (subjectCode, students = [], collegeName = '', lectureType = '', catalogSubjects = []) => {
  const normalizedCode = normalizeSubjectCode(subjectCode);
  if (!normalizedCode || !lectureType) {
    return [];
  }

  const catalogSubject = (catalogSubjects || []).find((subject) => (
    normalizeSubjectCode(subject.subjectCode) === normalizedCode
  ));
  if (catalogSubject) {
    const catalogGroups = Array.isArray(catalogSubject.groupsByType?.[lectureType])
      ? catalogSubject.groupsByType[lectureType]
      : [];

    return [...new Set(catalogGroups.map(normalizeGroup).filter(Boolean))]
      .sort()
      .map((section) => ({ value: section, label: `Group ${section}` }));
  }

  const derivedMap = buildDerivedCollegeSubjectsMap(students);
  const scopedMaps = collegeName
    ? [derivedMap.get(getCollegeScopeKey(collegeName))]
    : [...derivedMap.values()];

  const derivedGroups = [...new Set([
    ...scopedMaps
      .filter(Boolean)
      .flatMap((subjectMap) => {
        const subject = subjectMap.get(normalizedCode);
        if (!subject) return [];
        if (lectureType && subject.groupsByType.has(lectureType)) {
          return [...subject.groupsByType.get(lectureType)];
        }
        return [...subject.groups];
      }),
  ].map(normalizeGroup).filter(Boolean))].sort();

  return derivedGroups.map((section) => ({
    value: section,
    label: `Group ${section}`,
  }));
};

export const getTypeOptionsForSubject = (subjectCode, students = [], collegeName = '', catalogSubjects = []) => {
  const normalizedCode = normalizeSubjectCode(subjectCode);
  if (!normalizedCode) {
    return [];
  }

  const catalogSubject = (catalogSubjects || []).find((subject) => (
    normalizeSubjectCode(subject.subjectCode) === normalizedCode
  ));
  let availableTypes = catalogSubject?.types || [];

  if (!catalogSubject) {
    const derivedMap = buildDerivedCollegeSubjectsMap(students);
    const scopedMaps = collegeName
      ? [derivedMap.get(getCollegeScopeKey(collegeName))]
      : [...derivedMap.values()];
    availableTypes = [...new Set(scopedMaps
      .filter(Boolean)
      .flatMap((subjectMap) => [...(subjectMap.get(normalizedCode)?.types || [])]))];
  }

  return REGISTRATION_TYPE_OPTIONS.filter((option) => availableTypes.includes(option.value));
};

export const normalizeRegistrations = (registrations) => {
  const seen = new Set();

  return (registrations || []).reduce((accumulator, registration) => {
    const subjectCode = normalizeSubjectCode(registration.subjectCode);
    const subjectName = normalizeIdentifier(registration.subjectName || registration.subject_name || registration.name);
    const group = normalizeGroup(registration.group);
    const type = normalizeRegistrationType(registration.type);

    if (!subjectCode || !group || !type) {
      return accumulator;
    }

    const key = `${subjectCode}__${group}__${type}`;
    if (seen.has(key)) {
      return accumulator;
    }

    seen.add(key);
    accumulator.push({
      subjectCode,
      subjectName,
      group,
      type,
    });
    return accumulator;
  }, []);
};

export const normalizeRegistration = (registration) => normalizeRegistrations([registration])[0];

export const normalizeStudentRecord = (student, index = 0) => {
  const studentId = normalizeIdentifier(student.studentId || student.universityId);
  const nationalId = normalizeIdentifier(student.nationalId);
  const registrations = normalizeRegistrations(student.registrations || student.subjects || []);
  const college = normalizeIdentifier(student.college);
  const fallbackEmail = student.email || nationalId || (studentId ? `${studentId}@student.local` : '');

  return {
    id: student.id || createStudentInternalId(),
    name: normalizeIdentifier(student.name) || `Student ${index + 1}`,
    studentId,
    nationalId,
    college,
    registrations,
    email: fallbackEmail,
    password: student.password || '',
    userRole: 'student',
    avatar: student.avatar || createAvatarLabel(student.name),
    universityId: studentId,
  };
};

export const getEmptyStudentForm = () => ({
  name: '',
  studentId: '',
  nationalId: '',
  college: '',
});

export const getEmptyRegistrationDraft = () => ({
  subjectCode: '',
  group: '',
  type: '',
});

export const findExistingStudent = (students, candidate) => (
  students.find((student) => (
    (candidate.studentId && student.studentId && student.studentId === candidate.studentId) ||
    (candidate.nationalId && student.nationalId && student.nationalId === candidate.nationalId)
  )) || null
);

export const validateRegistrationDraft = (draft) => {
  if (!normalizeSubjectCode(draft.subjectCode)) {
    return 'studentsErrorSubjectCodeRequired';
  }

  if (!String(draft.type || '').trim() || !normalizeRegistrationType(draft.type)) {
    return 'studentsErrorTypeRequired';
  }

  if (!normalizeGroup(draft.group)) {
    return 'studentsErrorGroupRequired';
  }

  return '';
};

export const validateStudentPayload = ({ form, registrations, students, editingStudentId }) => {
  if (!normalizeIdentifier(form.name)) {
    return 'studentsErrorNameRequired';
  }

  if (!normalizeIdentifier(form.studentId) && !normalizeIdentifier(form.nationalId)) {
    return 'studentsErrorIdRequired';
  }

  if (!normalizeIdentifier(form.college)) {
    return 'studentsErrorCollegeRequired';
  }

  const duplicateStudent = students.find((student) => (
    student.id !== editingStudentId && (
      (form.studentId && student.studentId === normalizeIdentifier(form.studentId)) ||
      (form.nationalId && student.nationalId === normalizeIdentifier(form.nationalId))
    )
  ));

  if (duplicateStudent) {
    return 'studentsErrorDuplicateStudent';
  }

  return '';
};

export const buildStudentPayload = ({ form, registrations, existingStudent }) => {
  const normalizedName = normalizeIdentifier(form.name);
  const normalizedStudentId = normalizeIdentifier(form.studentId);
  const normalizedNationalId = normalizeIdentifier(form.nationalId);
  const normalizedCollege = normalizeIdentifier(form.college);
  const nextRegistrations = normalizeRegistrations(registrations);

  return {
    ...existingStudent,
    name: normalizedName,
    studentId: normalizedStudentId,
    nationalId: normalizedNationalId,
    college: normalizedCollege,
    registrations: nextRegistrations,
    universityId: normalizedStudentId,
    avatar: existingStudent?.avatar || createAvatarLabel(normalizedName),
    email: existingStudent?.email || normalizedNationalId || (normalizedStudentId ? `${normalizedStudentId}@student.local` : ''),
    password: existingStudent?.password || '',
    userRole: 'student',
  };
};

