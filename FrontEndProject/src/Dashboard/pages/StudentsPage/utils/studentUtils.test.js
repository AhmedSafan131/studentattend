import {
  getGroupOptionsForSubject,
  getSubjectOptionsForCollege,
  getTypeOptionsForSubject,
} from './studentUtils';

const catalogSubjects = [{
  subjectCode: 'CS101',
  subjectName: 'Introduction to Programming',
  types: ['Lecture', 'Section'],
  groups: ['A', 'B'],
  groupsByType: {
    Lecture: ['A', 'B'],
    Section: ['A'],
  },
}];

test('student editor subject options display only the name while retaining the code value', () => {
  expect(getSubjectOptionsForCollege('Computer Science & Engineering', [], catalogSubjects)).toEqual([{
    value: 'CS101',
    label: 'Introduction to Programming',
    dataset: {
      subjectCode: 'CS101',
      subjectName: 'Introduction to Programming',
    },
  }]);
});

test('student editor groups come from the selected catalog subject and lecture type', () => {
  expect(getGroupOptionsForSubject(
    'CS101',
    [],
    'Computer Science & Engineering',
    'Section',
    catalogSubjects,
  )).toEqual([{ value: 'A', label: 'Group A' }]);
});

test('student editor exposes only the types configured on the selected catalog subject', () => {
  expect(getTypeOptionsForSubject(
    'CS101',
    [],
    'Computer Science & Engineering',
    catalogSubjects,
  )).toEqual([
    { value: 'Lecture', label: 'Lecture' },
    { value: 'Section', label: 'Section' },
  ]);
});

test('student editor does not expose groups until a subject type is selected', () => {
  expect(getGroupOptionsForSubject(
    'CS101',
    [],
    'Computer Science & Engineering',
    '',
    catalogSubjects,
  )).toEqual([]);
});
