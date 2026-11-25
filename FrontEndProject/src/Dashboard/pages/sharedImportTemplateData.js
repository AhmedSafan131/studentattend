import { COURSES, FACULTY_CATALOG } from '../../utils/constants';

export const TEMPLATE_REGISTRATION_TYPES = ['Lecture', 'Section', 'Practical'];

const COURSE_GROUPS = new Map(COURSES.map((course) => [course.id.toUpperCase(), course.sections]));

// Faculties without preset courses still need a complete, matching set of demo sheets.
const DEMO_COURSES_BY_FACULTY = {
  nursing: [{ id: 'NUR101', name: 'Fundamentals of Nursing' }, { id: 'NUR102', name: 'Patient Care' }],
  pharmacy: [{ id: 'PHM101', name: 'Pharmaceutical Chemistry' }, { id: 'PHM102', name: 'Pharmacology' }],
  humanities: [{ id: 'HUM101', name: 'Communication Skills' }, { id: 'HUM102', name: 'Research Methods' }],
  'health-sciences-technology': [{ id: 'HST101', name: 'Medical Laboratory Basics' }, { id: 'HST102', name: 'Health Informatics' }],
  dentistry: [{ id: 'DEN101', name: 'Dental Anatomy' }, { id: 'DEN102', name: 'Oral Biology' }],
  'veterinary-medicine': [{ id: 'VET101', name: 'Animal Anatomy' }, { id: 'VET102', name: 'Veterinary Physiology' }],
  'physical-therapy': [{ id: 'PHT101', name: 'Human Movement' }, { id: 'PHT102', name: 'Therapeutic Exercise' }],
};

export const TEMPLATE_COLLEGES = FACULTY_CATALOG.flatMap((faculty, facultyIndex) => (
  faculty.colleges.map((college) => ({
    facultyId: faculty.id,
    facultyIndex,
    faculty: faculty.name,
    department: college.name,
    courses: college.courses.length ? college.courses : DEMO_COURSES_BY_FACULTY[faculty.id] || [],
  }))
));

const groupLabels = (count) => Array.from(
  { length: count },
  (_, index) => String.fromCharCode(65 + index),
);

export const buildTemplateSubjectCatalog = (facultyId = '') => TEMPLATE_COLLEGES
  .filter((college) => !facultyId || college.facultyId === facultyId)
  .flatMap((college) => college.courses.map((course, subjectIndex) => {
    const existingGroupCount = COURSE_GROUPS.get(String(course.id).toUpperCase())?.length || 1;
    const groupCounts = {
      Lecture: existingGroupCount,
      Section: Math.min(26, existingGroupCount + 1),
      Practical: Math.min(26, Math.max(1, existingGroupCount - 1)),
    };

    return {
      facultyId: college.facultyId,
      facultyIndex: college.facultyIndex,
      faculty: college.faculty,
      college: college.department,
      subjectIndex,
      subjectCode: course.id,
      subjectName: course.name,
      groupCounts,
      types: TEMPLATE_REGISTRATION_TYPES,
      groupsByType: Object.fromEntries(TEMPLATE_REGISTRATION_TYPES.map((type) => [type, groupLabels(groupCounts[type])])),
    };
  }));

export const getTemplateRegistrationCount = (studentIndex) => 5 + (studentIndex % 3);

export const buildTemplateRegistrationsForStudent = (college, studentIndex) => {
  const subjects = buildTemplateSubjectCatalog(college?.facultyId);
  const targetCount = getTemplateRegistrationCount(studentIndex);
  const registrations = [];
  const usedKeys = new Set();
  let cursor = 0;

  while (registrations.length < targetCount && cursor < targetCount * Math.max(subjects.length, 1) * 3) {
    const subject = subjects[(studentIndex + cursor) % subjects.length];
    if (!subject) break;

    const type = TEMPLATE_REGISTRATION_TYPES[Math.floor(cursor / subjects.length) % TEMPLATE_REGISTRATION_TYPES.length];
    const groups = subject.groupsByType[type];
    const groupCycle = Math.floor(cursor / (subjects.length * TEMPLATE_REGISTRATION_TYPES.length));
    const group = groups[(studentIndex + groupCycle) % groups.length];
    const key = `${subject.subjectCode}__${type}__${group}`;

    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      registrations.push({
        subject_code: subject.subjectCode,
        subject_name: subject.subjectName,
        type,
        group,
        faculty: subject.facultyId,
        department: subject.college,
      });
    }

    cursor += 1;
  }

  return registrations;
};

export const buildTemplateTeachingAssignments = () => buildTemplateSubjectCatalog()
  .flatMap((subject) => TEMPLATE_REGISTRATION_TYPES.map((type) => ({
    code: subject.subjectCode,
    name: subject.subjectName,
    type,
    faculty: subject.facultyId,
    department: subject.college,
    facultyId: subject.facultyId,
    facultyIndex: subject.facultyIndex,
    subjectIndex: subject.subjectIndex,
  })));
