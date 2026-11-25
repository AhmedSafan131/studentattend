import { needsLectureSessionsForRoute, needsManagedUsersForRoute } from './dashboardDataPolicy';

describe('dashboard data loading policy', () => {
  test.each([
    ['/dashboard/admin', 'admin'],
    ['/dashboard/settings', 'admin'],
    ['/dashboard/admin/', 'admin'],
  ])('loads managed users only where they are consumed (%s)', (pathname, userRole) => {
    expect(needsManagedUsersForRoute({ pathname, userRole })).toBe(true);
  });

  test.each([
    ['/dashboard/flexible-attendance', 'admin'],
    ['/dashboard/attendance', 'admin'],
    ['/dashboard/reports', 'admin'],
    ['/dashboard/admin', 'doctor'],
  ])('does not load managed users on unrelated routes (%s)', (pathname, userRole) => {
    expect(needsManagedUsersForRoute({ pathname, userRole })).toBe(false);
  });

  test.each([
    ['/dashboard/flexible-attendance', 'doctor'],
    ['/dashboard/reports', 'staff'],
    ['/dashboard', 'doctor'],
    ['/dashboard/qr', 'staff'],
    ['/dashboard', 'admin'],
    ['/student', 'student'],
  ])('does not load lecture history on unrelated routes (%s)', (pathname, userRole) => {
    expect(needsLectureSessionsForRoute({ pathname, userRole })).toBe(false);
  });
});

