import { getApiBasePath, normalizeApiBaseUrl } from './apiBaseUrl';

describe('API base URL normalization', () => {
  test.each([
    ['/attendance', '/attendance'],
    ['/attendance/', '/attendance'],
    ['/attendance/api', '/attendance'],
    ['/attendance/api/', '/attendance'],
    ['https://mnu.menofia.education/attendance/api', 'https://mnu.menofia.education/attendance'],
    ['/api', ''],
    ['', ''],
  ])('normalizes %s without duplicating the API segment', (input, expected) => {
    expect(normalizeApiBaseUrl(input)).toBe(expected);
  });

  it('uses the public application prefix for refresh cookies', () => {
    expect(getApiBasePath('/attendance/api')).toBe('/attendance');
    expect(getApiBasePath('https://mnu.menofia.education/attendance/api')).toBe('/attendance');
  });
});
