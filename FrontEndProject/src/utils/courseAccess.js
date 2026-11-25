import { COURSES, FACULTY_CATALOG } from './constants';

export const SESSION_TYPE_OPTIONS = ['Lecture', 'Section', 'Practical'];

export const isDoctorRole = (role) => role === 'staff' || role === 'doctor';

const normalizeValue = (value) => String(value || '').trim();
const normalizeLookup = (value) => String(value || '').trim().toLowerCase();
const normalizeCourseCode = (value) => String(value || '').trim().toUpperCase();
const normalizeGroup = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/^GROUP\s+/, '')
  .replace(/^GRP\s+/, '');

const facultyNameById = new Map(FACULTY_CATALOG.map((faculty) => [faculty.id, faculty.name]));
const collegeFacultyByName = new Map(
  FACULTY_CATALOG.flatMap((faculty) => (
    faculty.colleges.map((college) => [normalizeLookup(college.name), faculty])
  )),
);

const resolveFacultyId = (value) => {
  const normalized = normalizeLookup(value);
  if (!normalized) return '';

  const faculty = FACULTY_CATALOG.find((item) => (
    normalizeLookup(item.id) === normalized
    || normalizeLookup(item.name) === normalized
    || item.colleges.some((college) => (
      normalizeLookup(college.id) === normalized || normalizeLookup(college.name) === normalized
    ))
  ));

  return faculty?.id || normalized;
};

export const getFacultyName = (faculty) => facultyNameById.get(faculty) || normalizeValue(faculty);

const formatCourseName = (course) => {
  const code = normalizeValue(course.id);
  const name = normalizeValue(course.name);

  if (!code) return name;
  if (!name || name === code || name.startsWith(`${code} `) || name.startsWith(`${code} -`)) {
    return name || code;
  }

  return `${code} - ${name}`;
};

const buildCoursesFromStudents = (students = []) => {
  const grouped = new Map();

  (students || []).forEach((student) => {
    const faculty = collegeFacultyByName.get(normalizeLookup(student?.college));
    const facultyName = faculty?.name || normalizeValue(student?.college);

    (student?.registrations || []).forEach((registration) => {
      const courseId = normalizeCourseCode(registration.subjectCode);
      if (!courseId) return;

      const baseCourse = COURSES.find((course) => normalizeCourseCode(course.id) === courseId) || {};
      const current = grouped.get(courseId) || {
        ...baseCourse,
        id: courseId,
        name: formatCourseName({ id: courseId, name: registration.subjectName || baseCourse.name || courseId }),
        sections: [],
        faculties: [],
        types: [],
      };

      const group = normalizeGroup(registration.group);
      const registrationType = normalizeValue(registration.type) || 'Lecture';

      if (group && !current.sections.includes(group)) {
        current.sections.push(group);
      }

      if (facultyName && !current.faculties.includes(facultyName)) {
        current.faculties.push(facultyName);
      }

      if (!current.types.includes(registrationType)) {
        current.types.push(registrationType);
      }

      grouped.set(courseId, current);
    });
  });

  return [...grouped.values()]
    .map((course) => ({
      ...course,
      sections: course.sections.length ? course.sections.sort() : ['A'],
      types: course.types.length ? course.types : SESSION_TYPE_OPTIONS,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
};

export const getScopedCourses = ({ userRole, assignedCourses = [], students = [] }) => {
  const derivedCourses = buildCoursesFromStudents(students);

  if (!isDoctorRole(userRole)) {
    return derivedCourses;
  }

  if (!assignedCourses.length) {
    return [];
  }

  const grouped = new Map();

  assignedCourses.forEach((assignment) => {
    const courseId = normalizeValue(assignment.id);
    if (!courseId) return;

    const baseCourse = derivedCourses.find((course) => course.id === courseId)
      || COURSES.find((course) => course.id === courseId)
      || {};
    const current = grouped.get(courseId) || {
      ...baseCourse,
      id: courseId,
      name: formatCourseName({ id: courseId, name: assignment.name || baseCourse.name }),
      sections: baseCourse.sections || ['A'],
      faculties: [],
      types: [],
    };

    const facultyName = getFacultyName(assignment.faculty);
    const assignmentType = normalizeValue(assignment.type) || 'Lecture';

    if (facultyName && !current.faculties.includes(facultyName)) {
      current.faculties.push(facultyName);
    }

    if (!current.types.includes(assignmentType)) {
      current.types.push(assignmentType);
    }

    grouped.set(courseId, current);
  });

  return [...grouped.values()];
};

export const getScopedLectureTypes = ({ userRole, assignedCourses = [], courseId }) => {
  if (!isDoctorRole(userRole)) {
    return SESSION_TYPE_OPTIONS;
  }

  if (!assignedCourses.length) {
    return [];
  }

  const types = assignedCourses
    .filter((course) => course.id === courseId)
    .map((course) => normalizeValue(course.type) || 'Lecture')
    .filter(Boolean);

  return [...new Set(types)];
};

export const getCatalogAttendanceCourses = ({ userRole, assignedCourses = [], catalogSubjects = [], termCode = '' }) => {
  const grouped = new Map();
  const subjectsByFacultyAndCode = new Map();
  catalogSubjects.filter((subject) => !termCode || !subject.termCode || subject.termCode === termCode).forEach((subject) => {
    const key = `${subject.facultyId}__${normalizeCourseCode(subject.subjectCode)}`;
    if (!subjectsByFacultyAndCode.has(key) || subject.termCode === termCode) subjectsByFacultyAndCode.set(key, subject);
  });
  subjectsByFacultyAndCode.forEach((subject) => {
    const code = normalizeCourseCode(subject.subjectCode);
    const assignments = assignedCourses.filter((assignment) => (
      normalizeCourseCode(assignment.id) === code
      && [assignment.faculty, assignment.college]
        .some((value) => resolveFacultyId(value) === resolveFacultyId(subject.facultyId))
    ));
    const types = SESSION_TYPE_OPTIONS.filter((type) => (
      subject.types?.includes(type)
      && (!isDoctorRole(userRole) || assignments.some((assignment) => normalizeLookup(assignment.type) === normalizeLookup(type)))
    ));
    if (!types.length) return;
    const course = grouped.get(code) || {
      id: code, name: formatCourseName({ id: code, name: subject.subjectName }), faculties: [], types: [], groupsByType: {},
    };
    const facultyName = getFacultyName(subject.facultyId);
    if (!course.faculties.includes(facultyName)) course.faculties.push(facultyName);
    types.forEach((type) => {
      const count = Number(subject.groupCounts?.[type]);
      const groups = subject.groupsByType?.[type] || (Number.isInteger(count) && count > 0
        ? Array.from({ length: Math.min(26, count) }, (_, index) => String.fromCharCode(65 + index)) : []);
      if (!groups.length) return;
      if (!course.types.includes(type)) course.types.push(type);
      course.groupsByType[type] = [...new Set([...(course.groupsByType[type] || []), ...groups])].sort();
    });
    if (course.types.length) grouped.set(code, course);
  });
  return [...grouped.values()];
};

export const getScopedCourseLabel = (course) => {
  const faculties = course.faculties?.length ? ` - ${course.faculties.join(', ')}` : '';
  return `${course.name}${faculties}`;
};
