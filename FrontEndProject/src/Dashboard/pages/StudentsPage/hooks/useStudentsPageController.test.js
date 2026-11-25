import { act, renderHook, waitFor } from '@testing-library/react';
import { useStudentsPageController } from './useStudentsPageController';
import { deleteStudent, fetchStudentsPage, importStudents, updateStudent } from '../../../../services/studentsApi';
import { fetchCatalogSubjects } from '../../../../services/catalogApi';
import { parseStudentsWorkbooks } from '../utils/importStudentsWorkbook';

const mockUser = { isSystem: true, userRole: 'admin', allowedColleges: [] };
const mockToast = jest.fn();
const mockTranslate = (key) => key;
jest.mock('../../../../hooks', () => ({
  useAuth: () => ({ user: mockUser }),
  useToast: () => ({ showToast: mockToast }),
}));
jest.mock('../../../../i18n', () => ({ useLanguage: () => ({ t: mockTranslate }) }));
jest.mock('react-redux', () => ({ useSelector: (selector) => selector({ terms: { selectedTermCode: 'FIRST-2026-2027' } }) }));
jest.mock('../../../../services/studentsApi');
jest.mock('../../../../services/catalogApi');
jest.mock('../utils/importStudentsWorkbook');

test('import updates listed students and adds new students without deleting absent students, even for a system admin', async () => {
  const listed = { id: 'one', studentId: '1001', name: 'Old name', college: 'كلية الهندسة', registrations: [] };
  const absent = { ...listed, id: 'two', studentId: '1002', name: 'Absent student' };
  const registration = { subjectCode: 'EE101', subjectName: 'Circuit Analysis', type: 'Lecture', group: 'B' };
  const changed = { ...listed, name: 'Updated name', registrations: [registration] };
  const added = { ...listed, id: 'three', studentId: '1003', name: 'New student', registrations: [registration] };
  fetchStudentsPage.mockResolvedValue({ students: [listed, absent], pagination: { currentPage: 1, totalPages: 1, total: 2 } });
  fetchCatalogSubjects.mockResolvedValue([{ subjectCode: 'EE101' }]);
  parseStudentsWorkbooks.mockResolvedValue({ facultyId: 'engineering', students: [changed, added], invalidRows: [] });
  importStudents.mockResolvedValue({ created: 1, updated: 1 });

  const { result } = renderHook(() => useStudentsPageController());
  await waitFor(() => expect(result.current.students).toHaveLength(2));
  act(() => result.current.handleImportFacultyChange({ target: { value: 'engineering' } }));
  await act(async () => result.current.handleUploadFilePicked([{}]));
  await act(async () => result.current.handleUploadConfirm());

  expect(importStudents).toHaveBeenCalledWith([changed, added]);
  expect(deleteStudent).not.toHaveBeenCalled();
  expect(result.current.students).toHaveLength(2);
  expect(result.current.students.find((student) => student.id === 'two')).toEqual(expect.objectContaining(absent));
});

test('adding the same subject and teaching type shows a toast and keeps all registrations', async () => {
  mockToast.mockClear();
  const registrations = [
    { subjectCode: 'HUM101', subjectName: 'Communication Skills', type: 'Lecture', group: 'A' },
    { subjectCode: 'HUM102', subjectName: 'Research Methods', type: 'Lecture', group: 'A' },
    { subjectCode: 'HUM101', subjectName: 'Communication Skills', type: 'Section', group: 'A' },
    { subjectCode: 'HUM102', subjectName: 'Research Methods', type: 'Section', group: 'A' },
    { subjectCode: 'HUM101', subjectName: 'Communication Skills', type: 'Practical', group: 'A' },
  ];
  const student = {
    id: 'student-humanities',
    studentId: '2026060049',
    nationalId: '30605149120048',
    name: 'Adham Wael',
    college: 'علوم انسانيه',
    registrations,
  };
  fetchStudentsPage.mockResolvedValue({ students: [student], pagination: { currentPage: 1, totalPages: 1, total: 1 } });
  fetchCatalogSubjects.mockResolvedValue([]);
  updateStudent.mockImplementation(async (_id, payload) => ({ ...student, ...payload }));

  const { result } = renderHook(() => useStudentsPageController());
  await waitFor(() => expect(result.current.students).toHaveLength(1));

  act(() => result.current.handleEditStart(result.current.students[0]));
  act(() => result.current.handleRegistrationDraftChange({
    target: { name: 'subjectCode', value: 'HUM101', dataset: { subjectName: 'Communication Skills' } },
  }));
  act(() => result.current.handleRegistrationDraftChange({ target: { name: 'type', value: 'Lecture' } }));
  act(() => result.current.handleRegistrationDraftChange({ target: { name: 'group', value: 'B' } }));
  act(() => result.current.handleRegistrationAdd());

  expect(result.current.formRegistrations).toHaveLength(5);
  expect(result.current.formRegistrations).toEqual(expect.arrayContaining(registrations));
  expect(mockToast).toHaveBeenCalledWith({
    tone: 'info',
    title: 'studentsDuplicateRegistrationTitle',
    message: 'studentsDuplicateRegistrationMessage',
  });

  await act(async () => result.current.handleFormSubmit());
  expect(updateStudent).toHaveBeenCalledWith('student-humanities', expect.objectContaining({ registrations }));
});
