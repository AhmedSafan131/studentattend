import { selectAttendanceSession } from './attendanceSessionSelection';

const sessions = [{ id: 'old', status: 'migrated' }, { id: 'current', status: 'open' }];

test('loading existing sessions does not choose one for staff', () => {
  expect(selectAttendanceSession(sessions, '')).toBeNull();
  expect(selectAttendanceSession(sessions, 'deleted-session')).toBeNull();
});

test('explicitly choosing or creating a session makes it available', () => {
  expect(selectAttendanceSession(sessions, 'current')).toBe(sessions[1]);
  const created = { id: 'new', status: 'open' };
  expect(selectAttendanceSession([...sessions, created], 'new')).toBe(created);
});

test('admin migration keeps its previous default session selection', () => {
  expect(selectAttendanceSession(sessions, '', true)).toBe(sessions[1]);
  expect(selectAttendanceSession(sessions, 'old', true)).toBe(sessions[0]);
});
