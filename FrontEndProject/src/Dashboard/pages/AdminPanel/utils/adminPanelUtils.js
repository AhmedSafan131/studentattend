import { FACULTY_CATALOG } from '../../../../utils/constants';
import { getFacultySubjectOptionsFromStudents } from '../../StudentsPage/utils/studentUtils';

export const CLASS_TYPES = ['Lecture', 'Section', 'Practical'];
export const CLASS_TYPE_OPTIONS = CLASS_TYPES.map((item) => ({ value: item, label: item }));
export const FACULTY_OPTIONS = FACULTY_CATALOG.map((faculty) => ({
  value: faculty.id,
  label: faculty.name,
  labelKey: `faculty_${faculty.id}`,
}));
export const DEFAULT_IMPORTED_PASSWORD = '123456';

export const getSubjectOptions = (facultyId, students = []) => {
  const facultyIds = Array.isArray(facultyId) ? facultyId : [facultyId];
  const seen = new Set();

  if (students.some((item) => item?.subjectCode)) {
    return facultyIds
      .filter(Boolean)
      .flatMap((currentFacultyId) => {
        const faculty = FACULTY_CATALOG.find((item) => item.id === currentFacultyId);
        const college = faculty?.colleges?.[0];
        return students
          .filter((subject) => subject.facultyId === currentFacultyId)
          .map((subject) => ({
            value: `${currentFacultyId}__${college?.id || ''}__${subject.subjectCode}`,
            label: `${subject.subjectName || subject.subjectCode} (${subject.subjectCode})`,
            courseCode: subject.subjectCode,
            courseName: subject.subjectName || subject.subjectCode,
            faculty: currentFacultyId,
            college: college?.id || '',
            collegeName: college?.name || '',
            dataset: {
              courseCode: subject.subjectCode,
              courseName: subject.subjectName || subject.subjectCode,
              faculty: currentFacultyId,
              college: college?.id || '',
            },
          }));
      })
      .filter((option) => {
        const key = `${option.faculty}__${option.college}__${option.courseCode}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => left.courseCode.localeCompare(right.courseCode));
  }

  return facultyIds
    .filter(Boolean)
    .flatMap((currentFacultyId) => getFacultySubjectOptionsFromStudents(currentFacultyId, students))
    .filter((option) => {
      const key = `${option.faculty}__${option.college}__${option.courseCode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const AVATAR_COLORS = [
  ['#1a6b45', '#34d399'],
  ['#2563eb', '#60a5fa'],
  ['#7c3aed', '#a78bfa'],
  ['#db2777', '#f472b6'],
  ['#d97706', '#fbbf24'],
  ['#059669', '#6ee7b7'],
];

const normalizeLookupValue = (value) => String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');

export const getEmptyDoctorForm = () => ({
  name: '',
  nationalId: '',
  password: '',
  faculties: [],
  specialty: '',
});

export const getEmptyAssignmentDraft = () => ({
  courseCode: '',
  courseName: '',
  subjectKey: '',
  faculty: '',
  college: '',
  type: 'Lecture',
});

export const createAvatarLabel = (name) => (
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'DR'
);

export const avatarGradient = (index) => {
  const [first, second] = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return `linear-gradient(135deg, ${first}, ${second})`;
};

export const buildDoctorId = () => `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const buildDoctorLoginEmail = (doctorId) => {
  const normalized = String(doctorId || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-');

  return normalized ? `staff.${normalized}@local` : '';
};

export const getFacultyColleges = (facultyIds = []) => {
  const selectedIds = new Set((facultyIds || []).map((value) => String(value || '').trim()).filter(Boolean));

  return FACULTY_CATALOG
    .filter((faculty) => selectedIds.has(faculty.id))
    .flatMap((faculty) => faculty.colleges.map((college) => college.name));
};

export const getFacultyIdsFromAllowedColleges = (allowedColleges = []) => {
  const selectedCollegeNames = new Set(
    (allowedColleges || []).map((value) => String(value || '').trim()).filter(Boolean),
  );

  return FACULTY_CATALOG
    .filter((faculty) => faculty.colleges.some((college) => selectedCollegeNames.has(college.name)))
    .map((faculty) => faculty.id);
};

export const buildCourseUid = (courseId, type) => (
  `${courseId}-${type.slice(0, 3).toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
);

export const normalizeCourseCode = (value) => String(value || '').trim().toUpperCase();

export const normalizeClassType = (value) => {
  const cleanValue = normalizeLookupValue(value);
  const matchedType = CLASS_TYPES.find((item) => normalizeLookupValue(item) === cleanValue);
  return matchedType || 'Lecture';
};

export const resolveFaculty = (input) => {
  const normalized = normalizeLookupValue(input);
  if (!normalized) return null;

  return FACULTY_CATALOG.find((faculty) => (
    normalizeLookupValue(faculty.id) === normalized ||
    normalizeLookupValue(faculty.name) === normalized
  )) || null;
};

export const resolveCollege = (facultyId, input) => {
  const normalized = normalizeLookupValue(input);
  const colleges = facultyId
    ? FACULTY_CATALOG.find((faculty) => faculty.id === facultyId)?.colleges || []
    : FACULTY_CATALOG.flatMap((faculty) => faculty.colleges);

  if (!normalized) {
    return colleges.length === 1 ? colleges[0] : null;
  }

  return colleges.find((college) => (
    normalizeLookupValue(college.id) === normalized ||
    normalizeLookupValue(college.name) === normalized
  )) || null;
};

export const getCollegeOptions = (facultyId) => {
  const faculty = FACULTY_CATALOG.find((item) => item.id === facultyId);
  return (faculty?.colleges || []).map((college) => ({
    value: college.id,
    label: college.name,
  }));
};

export const findCatalogCourse = ({ courseCode, facultyId, collegeId, students = [] }) => {
  const normalizedCode = normalizeCourseCode(courseCode);
  if (!normalizedCode) return null;

  const derivedCourse = getSubjectOptions(facultyId, students).find((course) => (
    course.courseCode === normalizedCode
    && (!collegeId || course.college === collegeId)
  ));

  if (derivedCourse) {
    return {
      id: derivedCourse.courseCode,
      name: derivedCourse.courseName,
      faculty: derivedCourse.faculty,
      college: derivedCourse.college,
    };
  }

  return null;
};

export const buildAssignmentFromInput = (input, students = []) => {
  const courseCode = normalizeCourseCode(input.courseCode);
  const type = normalizeClassType(input.type);
  const resolvedFaculty = resolveFaculty(input.faculty);
  const resolvedCollege = resolveCollege(resolvedFaculty?.id, input.college);

  if (!courseCode) {
    return { error: 'Subject code is required.' };
  }

  if (!resolvedFaculty) {
    return { error: 'Choose a faculty for this subject.' };
  }

  if (!resolvedCollege) {
    return { error: 'Choose a department for this subject.' };
  }

  const catalogCourse = findCatalogCourse({
    courseCode,
    facultyId: resolvedFaculty.id,
    collegeId: resolvedCollege.id,
    students,
  });

  if (!catalogCourse && !String(input.courseName || '').trim()) {
    return { error: 'Subject code was not found in the selected faculty and department.' };
  }

  return {
    assignment: {
      id: courseCode,
      name: catalogCourse?.name || String(input.courseName || '').trim() || courseCode,
      faculty: resolvedFaculty.id,
      college: resolvedCollege.id,
      type,
    },
  };
};

export const getTeachingFacultyIds = (courses = []) => [...new Set(courses
  .map((course) => resolveFaculty(course.faculty)?.id
    || FACULTY_CATALOG.find((faculty) => faculty.colleges.some((college) => (
      normalizeLookupValue(college.id) === normalizeLookupValue(course.college)
      || normalizeLookupValue(college.name) === normalizeLookupValue(course.college)
    )))?.id)
  .filter(Boolean))];

export const getDoctorFacultyIds = (doctor) => [...new Set([
  ...getFacultyIdsFromAllowedColleges(doctor.allowedColleges),
  ...getTeachingFacultyIds(doctor.courses),
])];

export const isSameAssignment = (left, right) => (
  normalizeCourseCode(left.id) === normalizeCourseCode(right.id)
  && left.type === right.type
  && getTeachingFacultyIds([left])[0] === getTeachingFacultyIds([right])[0]
  && normalizeLookupValue(left.college) === normalizeLookupValue(right.college)
);

export const doctorHasAssignment = (doctor, assignment) => (
  doctor.courses.some((course) => isSameAssignment(course, assignment))
);

export const countUniqueSubjects = (doctors) => (
  new Set(doctors.flatMap((doctor) => doctor.courses.map((course) => course.id))).size
);

export const getDoctorOptions = (doctors) => (
  doctors.map((doctor) => ({
    value: doctor.id,
    label: `${doctor.name} (${doctor.email})`,
  }))
);

export const getDoctorCourseCountLabel = (doctor) => (
  `${doctor.courses.length} subject${doctor.courses.length === 1 ? '' : 's'}`
);
