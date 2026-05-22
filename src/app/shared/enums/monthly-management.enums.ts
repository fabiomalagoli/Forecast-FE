export const MONTHS_IN_YEAR = 12;
export const FIRST_SEMESTER_LENGTH = 6;
export const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat('it-IT', { month: 'long' });
export const DEFAULT_MONTHLY_TARIFFS = Array(MONTHS_IN_YEAR).fill(0);
export const YEAR_FORMATS = {
  parse: {
    dateInput: { year: 'numeric' }
  },
  display: {
    dateInput: { year: 'numeric' },
    monthYearLabel: { year: 'numeric' },
    dateA11yLabel: { year: 'numeric' },
    monthYearA11yLabel: { year: 'numeric' },
  },
}