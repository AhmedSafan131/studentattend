import { detectBrave, enforceDetectedStudentContext, getStudentBrowserAccess, updateStudentBrowserAccess } from './studentBrowserPolicy';

beforeEach(() => updateStudentBrowserAccess({ enabled: true, detected: true, blocked: false, verifiedRole: null }));

test('detects positive client hints, user agent and JS signals independently', async () => {
  expect(await detectBrave({ userAgent: 'Mozilla Brave/140' })).toBe('detected');
  expect(await detectBrave({ userAgentData: { brands: [{ brand: 'Brave' }] } })).toBe('detected');
  expect(await detectBrave({ brave: { isBrave: async () => true } })).toBe('detected');
});

test('unsupported, throwing and stuck detectors terminate without classifying unknown browsers as Brave', async () => {
  expect(await detectBrave({ userAgent: 'Version/18 Safari/605' })).toBe('unknown');
  expect(await detectBrave({ brave: { isBrave: () => { throw new Error('denied'); } } })).toBe('unknown');
  expect(await detectBrave({ brave: { isBrave: () => new Promise(() => {}) } }, 10)).toBe('unknown');
  expect(await detectBrave({ brave: { isBrave: async () => false } })).toBe('not-detected');
});

test('a negative JS result cannot override positive browser brand signals', async () => {
  expect(await detectBrave({ userAgentData: { brands: [{ brand: 'Brave' }] }, brave: { isBrave: async () => false } })).toBe('detected');
});

test('only server-confirmed student context is stopped; other roles and disabled policy continue', () => {
  for (const role of ['staff', 'doctor', 'admin', null]) expect(() => enforceDetectedStudentContext(role)).not.toThrow();
  expect(() => enforceDetectedStudentContext('student')).toThrow();
  expect(getStudentBrowserAccess().blocked).toBe(true);
  updateStudentBrowserAccess({ enabled: false, blocked: false });
  expect(() => enforceDetectedStudentContext('student')).not.toThrow();
});
