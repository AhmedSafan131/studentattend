import {
  buildAcademicWeekOptions,
  formatAcademicWeekDisplay,
  getAcademicTermWeekCount,
  getCurrentAcademicWeek,
  getCurrentAcademicWeekLabel,
} from './academicWeek';

const term = {
  code: 'TERM-1-2026-2027',
  startDate: '2026-09-19',
  endDate: '2027-01-08',
  weeksCount: 16,
};

describe('academic week calculation', () => {
  test('uses the term start date as the first day of week one', () => {
    expect(getCurrentAcademicWeek(new Date(2026, 8, 19), term)).toBe(1);
    expect(getCurrentAcademicWeek(new Date(2026, 8, 25), term)).toBe(1);
  });

  test('advances on every Saturday when the term starts on Saturday', () => {
    expect(getCurrentAcademicWeek(new Date(2026, 8, 26), term)).toBe(2);
    expect(getCurrentAcademicWeek(new Date(2026, 9, 3), term)).toBe(3);
    expect(getCurrentAcademicWeekLabel(new Date(2026, 9, 3), term)).toBe('Week 3');
  });

  test('stays within the term boundaries', () => {
    expect(getCurrentAcademicWeek(new Date(2026, 8, 1), term)).toBe(1);
    expect(getCurrentAcademicWeek(new Date(2027, 1, 1), term)).toBe(16);
  });

  test('builds the week list from the inclusive date range', () => {
    expect(getAcademicTermWeekCount(term)).toBe(16);
    expect(buildAcademicWeekOptions('Week', term)).toHaveLength(16);
  });

  test('formats stored week values clearly in both languages', () => {
    expect(formatAcademicWeekDisplay('Week 2', 'ar')).toBe('\u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u062b\u0627\u0646\u064a');
    expect(formatAcademicWeekDisplay('16', 'ar')).toBe('\u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u0633\u0627\u062f\u0633 \u0639\u0634\u0631');
    expect(formatAcademicWeekDisplay('Week 2', 'en')).toBe('Week 2');
  });
});
