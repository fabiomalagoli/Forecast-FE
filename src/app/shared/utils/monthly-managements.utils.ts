import { MonthlyResourceDetail } from '../models/monthly-management.model';

const MONTHS_IN_YEAR = 12;
const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat('it-IT', { month: 'long' });
const DEFAULT_MONTHLY_TARIFFS = Array(MONTHS_IN_YEAR).fill(0);

export function buildMonthlyResourceDetails(startMonth: number, length: number): MonthlyResourceDetail[] {
  return Array.from({ length }, (_, index) => {
    const month = startMonth + index;
    const monthName = MONTH_NAME_FORMATTER.format(new Date(Date.UTC(2026, month - 1)));

    return {
      month,
      name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      days: 0,
      tariffs: DEFAULT_MONTHLY_TARIFFS[month - 1] ?? 0,
      confirm: false
    };
  });
}