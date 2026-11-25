import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendanceWorkspace from './index';
import BulkAttendanceMethods from './BulkAttendanceMethods';
import BulkSessionSelector from './BulkSessionSelector';

jest.mock('../CustomDropdown', () => function Dropdown({ label, value, options, onChange, disabled }) { return <label>{label}<select aria-label={label} value={value} onChange={onChange} disabled={disabled}><option value="">Choose a session first</option>{options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select></label>; });

jest.mock('../../i18n', () => ({ useLanguage: () => ({ lang: 'en' }) }));
let mockRosterAllowed = true;
jest.mock('../AttendanceRoster', () => {
  const React = require('react');
  return function Roster({ onAvailabilityChange }) {
    React.useEffect(() => onAvailabilityChange(mockRosterAllowed), [onAvailabilityChange]);
    return mockRosterAllowed ? <div>Roster picker</div> : null;
  };
});

const session = { id: 'one', subjectName: 'Programming', lectureType: 'Lecture', group: 'A', week: '1', status: 'active' };
const oldSession = { ...session, status: 'ended' };
const newSession = { ...session, id: 'new', subjectName: 'New course' };
const otherSession = { ...session, id: 'other', subjectName: 'Physics' };
const availableSessions = [oldSession, newSession, otherSession];
function Harness({ createdSessionId = '', manageSessionId, initialId = '', variant = 'dashboard', weekOptions = [] }) {
  const [selectedId, setSelectedId] = React.useState(initialId);
  const selected = availableSessions.find((item) => item.id === selectedId) || null;
  return <AttendanceWorkspace
    session={selected} createdSessionId={createdSessionId} manageSessionId={manageSessionId} onSelectSession={setSelectedId} availableSessions={availableSessions} variant={variant} weekOptions={weekOptions}
    controls={<div>Session creation controls</div>} qr={<div>QR panel</div>}
    manual={<input aria-label="National ID" />} attendance={<div>Attendance records</div>}
    sessions={<button type="button" onClick={() => setSelectedId('one')}>Open saved session</button>}
    bulk={<><input aria-label="Bulk draft" /><output data-testid="bulk-target">{selectedId}</output></>}
  />;
}

test('flexible history keeps the sessions list beside manual entry and attendance', () => {
  render(<Harness variant="flexible" />);
  expect(screen.queryByLabelText('National ID')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'My sessions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open saved session' }));
  expect(screen.getByRole('button', { name: 'Open saved session' })).toBeVisible();
  expect(screen.getByLabelText('National ID')).toBeVisible();
  expect(screen.getByText('Attendance records')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Back to my sessions' })).not.toBeInTheDocument();
});

test('management always shows attendance and manual entry; saved sessions open in the same sessions tab', () => {
  render(<Harness />);
  expect(screen.getByText('Session creation controls')).toBeVisible();
  expect(screen.getByText('Attendance records')).toBeVisible();
  expect(screen.getByLabelText('National ID')).toBeVisible();
  expect(screen.getByTestId('bulk-target')).toBeEmptyDOMElement();
  fireEvent.click(screen.getByRole('tab', { name: 'My sessions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open saved session' }));
  expect(screen.getByRole('tab', { name: 'My sessions' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('Attendance records')).toBeVisible();
  expect(screen.getByLabelText('National ID')).not.toBeVisible();
  expect(screen.getByText('QR panel')).not.toBeVisible();
  expect(screen.getByText('Session creation controls')).not.toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Back to my sessions' }));
  expect(screen.getByRole('button', { name: 'Open saved session' })).toBeVisible();
  expect(screen.getByText('Attendance records')).not.toBeVisible();
});

test('bulk attendance has an explicit target and does not navigate away when it changes', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('tab', { name: 'Bulk attendance' }));
  const choose = (label, value) => fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value } });
  expect(screen.getByTestId('bulk-target')).toHaveTextContent('');
  choose('Subject', 'Programming');
  choose('Class type', 'Lecture');
  choose('Group', 'A');
  choose('Week', '1');
  expect(screen.getByTestId('bulk-target')).toHaveTextContent('one');
  fireEvent.change(screen.getByLabelText('Bulk draft'), { target: { value: 'draft' } });
  choose('Subject', 'Physics');
  expect(screen.getByTestId('bulk-target')).toBeEmptyDOMElement();
  expect(screen.getByRole('combobox', { name: 'Week' })).toBeDisabled();
  choose('Class type', 'Lecture');
  choose('Group', 'A');
  choose('Week', '1');
  expect(screen.getByTestId('bulk-target')).toHaveTextContent('other');
  expect(screen.getByRole('tab', { name: 'Bulk attendance' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('tab', { name: /Manage session/ }));
  expect(screen.getByText('Attendance records')).toBeVisible();
  expect(screen.getByLabelText('National ID')).toBeVisible();
  expect(screen.getByTestId('bulk-target')).toBeEmptyDOMElement();
  fireEvent.click(screen.getByRole('tab', { name: 'Bulk attendance' }));
  expect(screen.getByTestId('bulk-target')).toHaveTextContent('other');
  expect(screen.getByRole('combobox', { name: 'Subject' })).toHaveValue('Physics');
  expect(screen.getByRole('combobox', { name: 'Week' })).toHaveValue('1');
  expect(screen.getByLabelText('Bulk draft')).toHaveValue('draft');
});

test('returning to management restores its new session instead of the browsed saved session', () => {
  render(<Harness createdSessionId="new" initialId="new" />);
  expect(screen.getByText('Attendance records')).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: 'My sessions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open saved session' }));
  expect(screen.getByText(/^Programming .*Lecture/)).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: /Manage session/ }));
  expect(screen.getByText('Session creation controls')).toBeVisible();
  expect(screen.getByText('QR panel')).toBeVisible();
  expect(screen.getByLabelText('National ID')).toBeVisible();
  expect(screen.getByText('Attendance records')).toBeVisible();
  expect(screen.getByTestId('bulk-target')).toHaveTextContent('new');
});

test('management follows matching old session details and clears records when there is no match', () => {
  const { rerender } = render(<Harness manageSessionId="" />);
  expect(screen.getByText('Attendance records')).toBeVisible();
  expect(screen.getByLabelText('National ID')).toBeVisible();
  rerender(<Harness manageSessionId="one" />);
  expect(screen.getByTestId('bulk-target')).toHaveTextContent('one');
  expect(screen.getByText('Attendance records')).toBeVisible();
  expect(screen.getByLabelText('National ID')).toBeVisible();
  expect(screen.getByRole('tab', { name: /Manage session/ })).toHaveAttribute('aria-selected', 'true');
  rerender(<Harness manageSessionId="other" />);
  expect(screen.getByTestId('bulk-target')).toHaveTextContent('other');
  expect(screen.getByText('Attendance records')).toBeVisible();
  rerender(<Harness manageSessionId="" />);
  expect(screen.getByTestId('bulk-target')).toBeEmptyDOMElement();
  expect(screen.getByText('Attendance records')).toBeVisible();
  expect(screen.getByLabelText('National ID')).toBeVisible();
});

test('management matching does not override history selection and restores the form target on return', () => {
  const { rerender } = render(<Harness manageSessionId="other" />);
  fireEvent.click(screen.getByRole('tab', { name: 'My sessions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open saved session' }));
  expect(screen.getByTestId('bulk-target')).toHaveTextContent('one');
  rerender(<Harness manageSessionId="new" />);
  expect(screen.getByTestId('bulk-target')).toHaveTextContent('one');
  expect(screen.getByText('QR panel')).not.toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: /Manage session/ }));
  expect(screen.getByTestId('bulk-target')).toHaveTextContent('new');
  expect(screen.getByText('Attendance records')).toBeVisible();
});

test('keyboard navigation changes tabs and moves focus', () => {
  render(<Harness />);
  expect(screen.getAllByRole('tab')).toHaveLength(3);
  fireEvent.keyDown(screen.getByRole('tab', { name: /Manage session/ }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'Bulk attendance' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Bulk attendance' }), { key: 'End' });
  expect(screen.getByRole('tab', { name: 'My sessions' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('tab', { name: 'My sessions' }), { key: 'Home' });
  expect(screen.getByRole('tab', { name: /Manage session/ })).toHaveFocus();
});

test('bulk details isolate faculty, group and week and clear the target when a detail changes', () => {
  const select = jest.fn();
  render(<BulkSessionSelector sessions={[
    { ...session, id: 'dental-a1', faculty: 'Dentistry' },
    { ...session, id: 'dental-a5', faculty: 'Dentistry', week: 'Week 5' },
    { ...session, id: 'dental-b3', faculty: 'Dentistry', group: 'B', week: 'Week 3' },
    { ...session, id: 'medical-a1', faculty: 'Medicine' },
    { ...session, id: 'migrated', faculty: 'Dentistry', week: 'Week 9', status: 'migrated' },
  ]} onSelectSession={select} />);
  const choose = (label, value) => fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value } });
  expect(screen.getByRole('combobox', { name: 'Subject' })).toBeDisabled();
  choose('Faculty', 'Dentistry');
  choose('Subject', 'Programming');
  choose('Class type', 'Lecture');
  choose('Group', 'A');
  expect(select).toHaveBeenLastCalledWith('');
  const week = screen.getByRole('combobox', { name: 'Week' });
  expect([...week.options].map((option) => option.value)).toEqual(['', '1', '5']);
  choose('Week', '5');
  expect(select).toHaveBeenLastCalledWith('dental-a5');
  choose('Group', 'B');
  expect(select).toHaveBeenLastCalledWith('');
  expect(week).toHaveValue('');
  expect([...week.options].map((option) => option.value)).toEqual(['', '3']);
  choose('Week', '3');
  expect(select).toHaveBeenLastCalledWith('dental-b3');
  choose('Faculty', 'Medicine');
  expect(select).toHaveBeenLastCalledWith('');
  expect(screen.getByRole('combobox', { name: 'Subject' })).toHaveValue('');
  expect(screen.getByRole('combobox', { name: 'Group' })).toBeDisabled();
});

test('bulk week dropdown receives every academic-term week', () => {
  render(<Harness weekOptions={Array.from({ length: 6 }, (_, index) => ({ value: `Week ${index + 1}`, label: `Week ${index + 1}` }))} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Bulk attendance' }));
  const choose = (label, value) => fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value } });
  choose('Subject', 'Programming');
  choose('Class type', 'Lecture');
  choose('Group', 'A');
  const options = [...screen.getByRole('combobox', { name: 'Week' }).options];
  expect(options.map((option) => option.value)).toEqual(['', '1', '2', '3', '4', '5', '6']);
  expect(options.filter((option) => option.value).every((option) => !option.disabled)).toBe(true);
});

test('bulk details require an explicit session if several saved sessions match', () => {
  const select = jest.fn();
  render(<BulkSessionSelector sessions={[session, { ...session, id: 'duplicate' }]} onSelectSession={select} />);
  for (const [label, value] of [['Subject', 'Programming'], ['Class type', 'Lecture'], ['Group', 'A'], ['Week', '1']]) {
    fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value } });
  }
  expect(select).toHaveBeenLastCalledWith('');
  fireEvent.change(screen.getByRole('combobox', { name: 'Choose matching session' }), { target: { value: 'duplicate' } });
  expect(select).toHaveBeenLastCalledWith('duplicate');
});

test('roster and Excel show one method at a time and retain the upload draft', async () => {
  mockRosterAllowed = true;
  render(<BulkAttendanceMethods session={session} mode="dashboard"><input aria-label="Upload draft" /></BulkAttendanceMethods>);
  const roster = await screen.findByRole('button', { name: 'Student roster' });
  expect(screen.getByText('Roster picker')).toBeVisible();
  expect(screen.getByLabelText('Upload draft')).not.toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Upload Excel' }));
  fireEvent.change(screen.getByLabelText('Upload draft'), { target: { value: 'draft' } });
  expect(screen.getByLabelText('Upload draft')).toHaveValue('draft');
  expect(screen.getByText('Roster picker')).not.toBeVisible();
  fireEvent.click(roster);
  expect(screen.getByText('Roster picker')).toBeVisible();
  expect(screen.getByLabelText('Upload draft')).not.toBeVisible();
});

test('Excel remains available when the administrator disables the roster', () => {
  mockRosterAllowed = false;
  render(<BulkAttendanceMethods session={session} mode="flexible"><div>Excel upload</div></BulkAttendanceMethods>);
  expect(screen.queryByRole('button', { name: 'Student roster' })).not.toBeInTheDocument();
  expect(screen.getByText('Excel upload')).toBeVisible();
});
