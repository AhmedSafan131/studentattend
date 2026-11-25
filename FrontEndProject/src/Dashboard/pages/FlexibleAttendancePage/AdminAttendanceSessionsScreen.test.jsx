import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminAttendanceSessionsScreen } from './index';

jest.mock('qrcode.react', () => ({ QRCodeSVG: () => null }));
jest.mock('../../../components/AppHelmet', () => () => null);
jest.mock('../../../components/AttendanceWorkspace', () => () => null);
jest.mock('../../../components/AttendanceWorkspace/BulkAttendanceMethods', () => () => null);
jest.mock('../../../hooks/useFlexibleSessionLifecycle', () => ({ useFlexibleSessionLifecycle: jest.fn() }));
jest.mock('../../../hooks', () => ({
  useAuth: jest.fn(), useSocket: jest.fn(), useToast: jest.fn(),
}));
jest.mock('../../../i18n', () => ({ useLanguage: jest.fn() }));
jest.mock('../../../services/catalogApi', () => ({ fetchCatalogSubjects: jest.fn() }));
jest.mock('../../../utils/api', () => ({ adHocAttendanceAPI: {} }));
jest.mock('../../../components', () => ({
  ConfirmationDialog: () => null,
  CustomDropdown: ({ label, value, onChange, options = [] }) => (
    <label>{label}<select aria-label={label} value={value} onChange={onChange}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></label>
  ),
  CustomInput: ({ label, value, onChange, placeholder }) => (
    <label>{label}<input aria-label={label} value={value} onChange={onChange} placeholder={placeholder} /></label>
  ),
  CustomBottom: ({ text, onClick, disabled }) => <button type="button" onClick={onClick} disabled={disabled}>{text}</button>,
  Pagination: ({ currentPage, totalPages }) => <div>page {currentPage} of {totalPages}</div>,
}));

const selectedSession = {
  id: 'session-1',
  subjectCode: 'CS101',
  subjectName: 'Programming',
  faculty: 'Computers',
  lectureType: 'Lecture',
  group: 'A',
  week: '1',
  status: 'open',
  recordCount: 1,
  doctor: { name: 'Dr Test' },
  records: [{
    id: 'record-1', studentName: 'Student One', studentUniversityId: '20201001',
    studentCollege: 'Computers', scannedAt: '2026-10-29T08:00:00Z',
  }],
};

const props = {
  sessions: [selectedSession],
  selectedSession,
  setSelectedId: jest.fn(),
  loading: false,
  saving: false,
  onRefresh: jest.fn(),
  onExport: jest.fn(),
  onCloseAll: jest.fn(),
  canCloseAll: true,
  migrationSessionsSearchTerm: '',
  setMigrationSessionsSearchTerm: jest.fn(),
  migrationSessionsPage: 1,
  migrationSessionsPageSize: 5,
  migrationSessionsTotalPages: 1,
  paginatedMigrationSessions: [selectedSession],
  onMigrationSessionsPageChange: jest.fn(),
  onMigrationSessionsPageSizeChange: jest.fn(),
  rosterPage: 1,
  rosterPageSize: 10,
  rosterTotalPages: 1,
  paginatedRosterRecords: selectedSession.records,
  onRosterPageChange: jest.fn(),
  onRosterPageSizeChange: jest.fn(),
  rosterSearchTerm: '',
  setRosterSearchTerm: jest.fn(),
  adminFilters: { faculty: '', subject: '', lectureType: '', group: '', week: '', status: '' },
  setAdminFilters: jest.fn(),
  adminFilterOptions: {
    faculties: ['Computers'],
    subjects: [{ value: 'CS101', label: 'CS101 - Programming' }],
    lectureTypes: ['Lecture'],
    groups: ['A'],
    weeks: ['1'],
    statuses: ['open'],
  },
  lang: 'en',
  viewOnly: true,
};

beforeEach(() => jest.clearAllMocks());

test('admin attendance page is view-only and exposes session details', () => {
  render(<AdminAttendanceSessionsScreen {...props} />);

  expect(screen.getByText('Attendance sessions')).toBeInTheDocument();
  expect(screen.getAllByText(/CS101 - Programming/).length).toBeGreaterThan(0);
  expect(screen.getByText('Student One')).toBeInTheDocument();
  expect(screen.queryByText('Session details')).not.toBeInTheDocument();
  expect(screen.queryByText(/migrate/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /close all open sessions/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
});

test('admin can search and select a session without management actions', () => {
  render(<AdminAttendanceSessionsScreen {...props} />);

  fireEvent.change(screen.getAllByLabelText('Search')[0], { target: { value: 'CS101' } });
  expect(props.setMigrationSessionsSearchTerm).toHaveBeenCalledWith('CS101');
  fireEvent.click(screen.getAllByRole('button', { name: /CS101 - Programming/ })[0]);
  expect(props.setSelectedId).toHaveBeenCalledWith('session-1');
  fireEvent.click(screen.getByRole('button', { name: /close all open sessions/i }));
  expect(props.onCloseAll).toHaveBeenCalledTimes(1);
});

test('admin filters attendance sessions by their session fields', () => {
  render(<AdminAttendanceSessionsScreen {...props} />);

  expect(screen.getByLabelText('Subject')).toBeInTheDocument();
  expect(screen.getByLabelText('Subject type')).toBeInTheDocument();
  expect(screen.getByLabelText('Group')).toBeInTheDocument();
  expect(screen.getByLabelText('Week')).toBeInTheDocument();
  expect(screen.getByLabelText('Status')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Faculty'), { target: { value: 'Computers' } });
  const updater = props.setAdminFilters.mock.calls[0][0];
  expect(updater(props.adminFilters)).toEqual({ ...props.adminFilters, faculty: 'Computers' });
});
