const MILLISECONDS_PER_DAY = 86400000;

const ARABIC_WEEK_ORDINALS = {
  1: '\u0627\u0644\u0623\u0648\u0644',
  2: '\u0627\u0644\u062b\u0627\u0646\u064a',
  3: '\u0627\u0644\u062b\u0627\u0644\u062b',
  4: '\u0627\u0644\u0631\u0627\u0628\u0639',
  5: '\u0627\u0644\u062e\u0627\u0645\u0633',
  6: '\u0627\u0644\u0633\u0627\u062f\u0633',
  7: '\u0627\u0644\u0633\u0627\u0628\u0639',
  8: '\u0627\u0644\u062b\u0627\u0645\u0646',
  9: '\u0627\u0644\u062a\u0627\u0633\u0639',
  10: '\u0627\u0644\u0639\u0627\u0634\u0631',
  11: '\u0627\u0644\u062d\u0627\u062f\u064a \u0639\u0634\u0631',
  12: '\u0627\u0644\u062b\u0627\u0646\u064a \u0639\u0634\u0631',
  13: '\u0627\u0644\u062b\u0627\u0644\u062b \u0639\u0634\u0631',
  14: '\u0627\u0644\u0631\u0627\u0628\u0639 \u0639\u0634\u0631',
  15: '\u0627\u0644\u062e\u0627\u0645\u0633 \u0639\u0634\u0631',
  16: '\u0627\u0644\u0633\u0627\u062f\u0633 \u0639\u0634\u0631',
  17: '\u0627\u0644\u0633\u0627\u0628\u0639 \u0639\u0634\u0631',
  18: '\u0627\u0644\u062b\u0627\u0645\u0646 \u0639\u0634\u0631',
  19: '\u0627\u0644\u062a\u0627\u0633\u0639 \u0639\u0634\u0631',
  20: '\u0627\u0644\u0639\u0634\u0631\u0648\u0646',
};

const getWeekNumber = (value) => {
  const match = String(value ?? '').match(/\d+/);
  return match ? Number(match[0]) : null;
};

export const formatAcademicWeekDisplay = (value, lang = 'en') => {
  const weekNumber = getWeekNumber(value);
  if (!weekNumber) return String(value || '-');

  if (lang === 'ar') {
    return `\u0627\u0644\u0623\u0633\u0628\u0648\u0639 ${ARABIC_WEEK_ORDINALS[weekNumber] || weekNumber}`;
  }

  return `Week ${weekNumber}`;
};

const parseCalendarDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

const calendarDayNumber = (date) => Date.UTC(
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
) / MILLISECONDS_PER_DAY;

export const getAcademicTermWeekCount = (term) => {
  const start = parseCalendarDate(term?.startDate || term?.start_date);
  const end = parseCalendarDate(term?.endDate || term?.end_date);

  if (start && end && end >= start) {
    return Math.max(1, Math.ceil((calendarDayNumber(end) - calendarDayNumber(start) + 1) / 7));
  }

  return Math.max(1, Number(term?.weeksCount || term?.weeks_count) || 1);
};

// The term start date is day one of week one. When it is a Saturday, every
// following Saturday automatically advances the selected week.
export const getCurrentAcademicWeek = (date = new Date(), term = null) => {
  const today = parseCalendarDate(date);
  const termStart = parseCalendarDate(term?.startDate || term?.start_date);

  if (!today || !termStart) return 1;

  const elapsedDays = calendarDayNumber(today) - calendarDayNumber(termStart);
  const week = Math.max(1, Math.floor(elapsedDays / 7) + 1);
  return Math.min(week, getAcademicTermWeekCount(term));
};

export const getCurrentAcademicWeekLabel = (date = new Date(), term = null) => (
  `Week ${getCurrentAcademicWeek(date, term)}`
);

export const buildAcademicWeekOptions = (label, term = null) => (
  Array.from({ length: getAcademicTermWeekCount(term) }, (_, index) => ({
    value: String(index + 1),
    label: `${label} ${index + 1}`,
  }))
);
