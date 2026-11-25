import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendanceRoster from './index';
import { rosterAPI } from './api';

let mockTerm = 'CURRENT';
jest.mock('react-redux', () => ({ useSelector: (selector) => selector({ terms: { selectedTermCode: mockTerm } }) }));
jest.mock('../../hooks', () => ({ useAuth: () => ({ user: { id: 'doctor-1' } }) }));
jest.mock('../../i18n', () => ({ useLanguage: () => ({ lang: 'en', t: (key) => key }) }));
jest.mock('../CustomDropdown', () => () => null);
jest.mock('./api', () => ({ rosterAPI: { options: jest.fn(), list: jest.fn(), save: jest.fn() } }));

const session = { id: 'lecture-1', courseCode: 'CS101', lectureType: 'Lecture', group: 'A', week: '1' };
const student = (id, present = false) => ({ id, name: `Student ${id}`, nationalId: `NID-${id}`, groups: ['A'], isRegistered: true, present });

beforeEach(() => {
  jest.clearAllMocks();
  mockTerm = 'CURRENT';
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  rosterAPI.options.mockResolvedValue({ data: { data: { dashboard: true, flexible: true } } });
  rosterAPI.list.mockImplementation((mode, id, params) => Promise.resolve({ data: {
    data: params.page === 2 ? [student('two')] : [student('one'), student('present', true)],
    total: 3, page: params.page, lastPage: 2,
  } }));
});

async function openRoster() {
  fireEvent.click(await screen.findByRole('button', { name: 'Select from student roster' }));
  await screen.findByText('Student one');
}

test('disabled feature has no entry point and makes no student-list requests', async () => {
  rosterAPI.options.mockResolvedValue({ data: { data: { dashboard: false } } });
  render(<AttendanceRoster session={session} mode="dashboard" />);
  await waitFor(() => expect(rosterAPI.options).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Select from student roster' })).not.toBeInTheDocument();
  expect(rosterAPI.list).not.toHaveBeenCalled();
});

test('selection survives pagination, skips existing attendance, and saves only after confirmation', async () => {
  const onSaved = jest.fn();
  rosterAPI.save.mockResolvedValue({ data: { results: [{ id: 'one', status: 'added' }, { id: 'two', status: 'existing' }] } });
  render(<AttendanceRoster session={session} mode="dashboard" onSaved={onSaved} />);
  await openRoster();
  expect(screen.getByRole('checkbox', { name: /Student present/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /Student one/ }));
  expect(rosterAPI.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  await screen.findByText('Student two');
  fireEvent.click(screen.getByRole('checkbox', { name: /Student two/ }));
  expect(screen.getByText('Selected: 2 — on this page: 1 — outside: 1 — total search results: 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Record 2 students' }));
  expect(rosterAPI.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm attendance' }));
  await waitFor(() => expect(rosterAPI.save).toHaveBeenCalledWith('dashboard', 'lecture-1', ['one', 'two']));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(screen.getByText('Added 1; already present 1; failed 0.')).toBeInTheDocument();
});

test('failed requests preserve choices for retry and closing asks before discarding', async () => {
  rosterAPI.save.mockRejectedValue({ response: { status: 403 } });
  render(<AttendanceRoster session={session} mode="dashboard" />);
  await openRoster();
  fireEvent.click(screen.getByRole('checkbox', { name: /Student one/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Record 1 students' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm attendance' }));
  await screen.findByRole('alert');
  expect(await screen.findByRole('checkbox', { name: /Student one/ })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.getByText('Discard unsaved selections and close?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(await screen.findByRole('checkbox', { name: /Student one/ })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard and close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('changing session or term clears pending selection', async () => {
  const { rerender } = render(<AttendanceRoster session={session} mode="dashboard" />);
  await openRoster();
  fireEvent.click(screen.getByRole('checkbox', { name: /Student one/ }));
  mockTerm = 'OTHER';
  rerender(<AttendanceRoster session={session} mode="dashboard" />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await openRoster();
  expect(screen.getByRole('checkbox', { name: /Student one/ })).not.toBeChecked();
});

test('search-result selection includes other pages and excludes students already present', async () => {
  render(<AttendanceRoster session={session} mode="flexible" />);
  await openRoster();
  fireEvent.click(screen.getByRole('button', { name: 'Select all results — 3' }));
  expect(await screen.findByText('Selected: 2 — on this page: 1 — outside: 1 — total search results: 3')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Deselect results — 2' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show selected' }));
  expect(screen.getByText('Student one')).toBeInTheDocument();
  expect(screen.getByText('Student two')).toBeInTheDocument();
  expect(screen.queryByText('Student present')).not.toBeInTheDocument();
});

test('a connection failure after a saved batch retains only unfinished selections for retry', async () => {
  const onSaved = jest.fn();
  rosterAPI.list.mockImplementation((mode, id, params) => Promise.resolve({ data: {
    data: params.page === 1 ? Array.from({ length: 100 }, (_, index) => student(String(index))) : [student('last')],
    total: 101, page: params.page, lastPage: 2,
  } }));
  rosterAPI.save.mockImplementationOnce((mode, id, ids) => Promise.resolve({ data: { results: ids.map((id) => ({ id, status: 'added' })) } }))
    .mockRejectedValueOnce(new Error('Connection lost'));
  render(<AttendanceRoster session={session} mode="dashboard" onSaved={onSaved} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Select from student roster' }));
  await screen.findByText('Student 0');
  fireEvent.click(screen.getByRole('button', { name: 'Select all results — 101' }));
  await screen.findByRole('button', { name: 'Record 101 students' });
  fireEvent.click(screen.getByRole('button', { name: 'Record 101 students' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm attendance' }));
  await screen.findByRole('alert');
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(rosterAPI.save).toHaveBeenCalledTimes(2);
  expect(rosterAPI.save.mock.calls[0][2]).toHaveLength(100);
  expect(rosterAPI.save.mock.calls[1][2]).toEqual(['last']);
  fireEvent.click(screen.getByRole('button', { name: 'Show selected' }));
  expect(screen.getByRole('checkbox', { name: /Student last/ })).toBeChecked();
  expect(screen.queryByText('Student 0')).not.toBeInTheDocument();
});

test('current-page and search-result controls toggle selection from the same buttons', async () => {
  render(<AttendanceRoster session={session} mode="dashboard" />);
  await openRoster();

  fireEvent.click(screen.getByRole('button', { name: 'Select page — 0/1' }));
  expect(screen.getByRole('button', { name: 'Deselect page — 1/1' })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /Student one/ })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Deselect page — 1/1' }));
  expect(screen.getByRole('checkbox', { name: /Student one/ })).not.toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: 'Select all results — 3' }));
  await screen.findByRole('button', { name: 'Deselect results — 2' });
  fireEvent.click(screen.getByRole('button', { name: 'Deselect results — 2' }));
  await waitFor(() => expect(screen.getByText('Selected: 0 — on this page: 0 — outside: 0 — total search results: 3')).toBeInTheDocument());
});

test('search accepts an academic ID and keeps selection controls beside it', async () => {
  render(<AttendanceRoster session={session} mode="dashboard" />);
  await openRoster();

  const searchInput = screen.getByLabelText('Search by name, national ID, or academic ID');
  fireEvent.change(searchInput, { target: { value: 'ACADEMIC-204' } });

  expect(screen.getByText('students selected')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Show selected' })).toBeInTheDocument();
  await waitFor(() => expect(rosterAPI.list).toHaveBeenLastCalledWith(
    'dashboard',
    'lecture-1',
    { search: 'ACADEMIC-204', page: 1 },
  ));
});

test('select all is not capped at 500 students', async () => {
  rosterAPI.list.mockImplementation((mode, id, params) => Promise.resolve({ data: {
    data: params.page === 2
      ? [student('500')]
      : Array.from({ length: 500 }, (_, index) => student(String(index))),
    total: 501, page: params.page, lastPage: 2,
  } }));
  render(<AttendanceRoster session={session} mode="dashboard" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Select from student roster' }));
  await screen.findByText('Student 0');
  fireEvent.click(screen.getByRole('button', { name: 'Select all results — 501' }));
  expect(await screen.findByRole('button', { name: 'Record 501 students' })).toBeEnabled();
});

test('shows only national ID and explains a missing course group', async () => {
  rosterAPI.list.mockResolvedValue({ data: {
    data: [{ ...student('free'), groups: [], isRegistered: false }], total: 1, page: 1, lastPage: 1,
  } });
  render(<AttendanceRoster session={session} mode="flexible" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Select from student roster' }));
  await screen.findByText('Student free');
  expect(screen.getByText('National ID')).toBeInTheDocument();
  expect(screen.getByText('NID-free')).toBeInTheDocument();
  expect(screen.getByText('Not registered in course')).toBeInTheDocument();
});
