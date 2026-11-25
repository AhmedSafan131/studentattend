import { getCatalogAttendanceCourses } from './courseAccess';
import { FACULTY_CATALOG } from './constants';

const subject = {
  facultyId: 'computers-ai', subjectCode: 'CS101', subjectName: 'Programming',
  types: ['Lecture', 'Section', 'Practical'],
  groupCounts: { Lecture: 3, Section: 4, Practical: 2 },
};
const assignment = (type) => ({ id: 'CS101', faculty: 'computers-ai', type });

test('catalog provides each type group count even without student registrations', () => {
  const [course] = getCatalogAttendanceCourses({ userRole: 'staff', assignedCourses: ['Lecture', 'Section', 'Practical'].map(assignment), catalogSubjects: [subject] });
  expect(course.groupsByType).toEqual({ Lecture: ['A', 'B', 'C'], Section: ['A', 'B', 'C', 'D'], Practical: ['A', 'B'] });
});

test('only explicitly assigned types in the matching faculty are available', () => {
  const [course] = getCatalogAttendanceCourses({ userRole: 'staff', assignedCourses: [assignment('Section')], catalogSubjects: [subject, { ...subject, facultyId: 'engineering', groupCounts: { Lecture: 26 } }] });
  expect(course.types).toEqual(['Section']);
  expect(course.groupsByType).toEqual({ Section: ['A', 'B', 'C', 'D'] });
  expect(getCatalogAttendanceCourses({ userRole: 'staff', assignedCourses: [], catalogSubjects: [subject] })).toEqual([]);
});

test('faculty assignments match catalog faculties by faculty or college name', () => {
  const catalogFaculty = FACULTY_CATALOG.find((faculty) => faculty.id === 'computers-ai');
  const byFacultyName = getCatalogAttendanceCourses({
    userRole: 'staff',
    assignedCourses: [{ ...assignment('Lecture'), faculty: catalogFaculty.name }],
    catalogSubjects: [subject],
  });
  const byCollegeName = getCatalogAttendanceCourses({
    userRole: 'staff',
    assignedCourses: [{ ...assignment('Lecture'), faculty: '', college: catalogFaculty.colleges[0].name }],
    catalogSubjects: [subject],
  });

  expect(byFacultyName).toHaveLength(1);
  expect(byCollegeName).toHaveLength(1);
});

test('disabled types and empty groups do not become selectable', () => {
  expect(getCatalogAttendanceCourses({ userRole: 'staff', assignedCourses: [assignment('Practical')], catalogSubjects: [{ ...subject, groupCounts: { Practical: 0 } }] })).toEqual([]);
});

test('current term counts override a legacy catalog entry and preserve partial type assignments', () => {
  const [course] = getCatalogAttendanceCourses({
    userRole: 'staff', assignedCourses: [assignment('Lecture'), assignment('Practical')], termCode: 'CURRENT',
    catalogSubjects: [
      { ...subject, termCode: 'CURRENT' },
      { ...subject, termCode: null, groupCounts: { Lecture: 26, Section: 26, Practical: 26 } },
      { ...subject, termCode: 'OLD', groupCounts: { Lecture: 10 } },
    ],
  });
  expect(course.types).toEqual(['Lecture', 'Practical']);
  expect(course.groupsByType).toEqual({ Lecture: ['A', 'B', 'C'], Practical: ['A', 'B'] });
});
