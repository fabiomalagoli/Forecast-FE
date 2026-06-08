import { Project } from '../models/project.model';
import { COMPLETE_PROJECT_HEADERS } from '../../pages/projects/project/complete-project.headers';
import { ProjectRole } from '../models/project.model';

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;

export type LookupOption = {
  id: string;
  name?: string;
  surname?: string;
  [key: string]: any;
};

export type ProjectFormHeader = {
  key: string;
  label: string;
};

export type WinProbabilityError = 'required' | 'range' | null;

export function cloneProjectForEdit(project: Project): any {
  return JSON.parse(JSON.stringify(project));
}

export function buildEditableProjectHeaders(): ProjectFormHeader[] {
  return (Object.entries(COMPLETE_PROJECT_HEADERS) as [keyof Project, string][])
    .filter(([key]) => key !== 'id' && key !== 'projectEmployees' && key !== 'projectJobRoles')
    .map(([key, label]) => {
      let formKey = key as string;

      if (['company', 'customer', 'pm', 'projectStatus'].includes(formKey)) {
        formKey += 'Id';
      }

      return { key: formKey, label };
    });
}

export function normalizeProjectFormData(
  formData: any,
  lookups: {
    companies: LookupOption[];
    customers: LookupOption[];
    statuses: LookupOption[];
    employees: LookupOption[];
    roles: LookupOption[];
    levels: LookupOption[];
  },
): any {
  formData.companyId = findOptionIdByName(lookups.companies, formData.company);
  formData.customerId = findOptionIdByName(lookups.customers, formData.customer);
  formData.projectStatusId = findOptionIdByName(lookups.statuses, formData.projectStatus);
  formData.pmId = findEmployeeIdByFullName(lookups.employees, formData.pm);

  formData.projectJobRoles = (formData.projectJobRoles || []).map((role: any) =>
    normalizeProjectRoleForForm(role, lookups.roles, lookups.levels),
  );

  formData.projectEmployees = (formData.projectEmployees || []).map((employee: any) =>
    normalizeProjectEmployeeForForm(employee, lookups.employees, lookups.roles, lookups.levels),
  );

  formData.startDate = toDateInputValue(formData.startDate);
  formData.endDate = toDateInputValue(formData.endDate);
  formData.winProbability = parseDecimalNumber(formData.winProbability || 0);
  formData.totalDays = Number(formData.totalDays || 0);

  return formData;
}

export function calculateProjectTotals(entries: any[]): { totalDays: number; totalBudget: number } {
  return entries.reduce(
    (totals, item) => {
      const dailyCost = parseCurrencyNumber(item.dailyCost);
      const days = Number(item.daysSpent || 0);

      return {
        totalDays: totals.totalDays + days,
        totalBudget: totals.totalBudget + dailyCost * days,
      };
    },
    { totalDays: 0, totalBudget: 0 },
  );
}

export function cleanProbability(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = String(value).trim().replace(',', '.');
  return Number(normalized) || 0;
}

export function parseCurrencyNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return NaN;

  const raw = String(value).trim().replace(/[\u20AC\s]/g, '');
  if (!raw) return NaN;

  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  let normalized = raw;

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalIndex = lastComma > lastDot ? lastComma : lastDot;
    normalized = raw.replace(/[.,]/g, (match, offset) => (offset === decimalIndex ? '.' : ''));
  } else if (lastComma !== -1) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = raw.replace(/,/g, '');
  }

  return Number(normalized);
}

export function getProjectFieldPattern(key: string): string {
  if (key === 'winProbability') {
    // Accetta sia il punto che la virgola (1-100 con max 2 decimali)
    return '^(100([.,]0{1,2})?|[1-9][0-9]?([.,][0-9]{1,2})?)$';
  }
  
  if (key === 'totalBudget') {
    return '^\\s*(?:\\u20AC\\s*)?(?:\\d{1,3}(?:[.,]\\d{3})*|\\d+)(?:[.,]\\d{1,2})?\\s*(?:\\u20AC\\s*)?$';
  }
  
  if (key === 'totalDays') {
    return '^[0-9]+$';
  }
  
  return '';
}

export function getProjectFormComparableSnapshot(formData: any): string {
  const comparable = {
    ...formData,
    winProbability: parseDecimalNumber(formData.winProbability),
    
    totalBudget: parseCurrencyNumber(formData.totalBudget),
    totalDays: Number(formData.totalDays || 0),

    projectJobRoles: getComparableProjectJobRoles(formData.projectJobRoles || []),
    projectEmployees: getComparableProjectEmployees(formData.projectEmployees || []),
  };

  return JSON.stringify(comparable);
}

export function formatEuroCurrency(value: number): string {
  if (isNaN(value)) return '0,00 €';

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

export function parseDecimalNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return NaN;
  const raw = String(value).trim().replace(',', '.');
  const num = Number(raw);
  return Number.isFinite(num) ? num : NaN;
}

export function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;

  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return null;

  return new Date(Date.UTC(year, month - 1, day));
}

export function getExclusiveDaysDiff(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}

export function getDateAfterDays(start: Date, totalDays: number): string {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + Math.floor(totalDays));
  return end.toISOString().slice(0, 10);
}

export function getTodayIsoDate(): string {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function createEmptyProjectFormData(defaultStatusId: string | null): any {
  return {
    name: '',
    description: '',
    companyId: null,
    customerId: null,
    pmId: null,
    projectStatusId: defaultStatusId,
    startDate: getTodayIsoDate(),
    endDate: '',
    totalDays: 0,
    winProbability: 0,
    totalBudget: '0,00 €',
    projectEmployees: [],
    projectJobRoles: [],
  };
}

export function toElementId(prefix: string, key: string, index: number): string {
  return `${prefix}-${index}-${key}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
}

export function isProjectRoleComplete(role: any): boolean {
  const hasRole = !!role?.jobRole && String(role.jobRole).trim() !== '';
  const hasLevel = !!role?.jobRoleLevel && String(role.jobRoleLevel).trim() !== '';
  const dailyCost = parseCurrencyNumber(role?.dailyCost);
  const daysSpent = Number(role?.daysSpent);
  const winProbability = parseDecimalNumber(role?.winProbability);

  return !!(
    hasRole &&
    hasLevel &&
    !isNaN(dailyCost) &&
    dailyCost > 0 &&
    !isNaN(daysSpent) &&
    daysSpent > 0 &&
    !isNaN(winProbability) &&
    winProbability >= 1 &&
    winProbability <= 100
  );
}

export function isProjectEmployeeComplete(employee: any): boolean {
  const dailyCost = parseCurrencyNumber(employee?.dailyCost);
  const daysSpent = Number(employee?.daysSpent || 0);
  const winProbability = parseDecimalNumber(employee?.winProbability);

  return !!(
    !!employee?.employeeId &&
    !isNaN(dailyCost) &&
    dailyCost > 0 &&
    !isNaN(daysSpent) &&
    daysSpent > 0 &&
    !isNaN(winProbability) &&
    winProbability >= 1 &&     // Controllo limite minimo (1%)
    winProbability <= 100      // Controllo limite massimo (100%)
  );
}

export function getWinProbabilityError(item: any): WinProbabilityError {
  const value = item?.winProbability;
  if (value === null || value === undefined || value === '') return 'required';

  const num = parseDecimalNumber(value);
  if (!Number.isFinite(num) || num < 1 || num > 100) return 'range';

  return null;
}

export function createEmptyProjectRole(): any {
  return {
    id: crypto.randomUUID(),
    jobRole: null,
    jobRoleLevel: null,
    dailyCost: null,
    daysSpent: null,
    winProbability: null,
  };
}

export function createEmptyProjectEmployee(): any {
  return {
    id: crypto.randomUUID(),
    employeeId: null,
    dailyCost: null,
    daysSpent: null,
    winProbability: null,
  };
}

export function getProjectEmployeeRequestId(employee: any): string {
  return employee?.id;
}

export function isTemporaryProjectItem(id: string, originalItems: { id: string }[] = []): boolean {
  return !originalItems.some((item) => item.id === id);
}

export function getRemovedProjectItems<T extends { id: string }>(originalItems: T[], currentItems: T[]): T[] {
  return originalItems.filter(
    (originalItem) => !currentItems?.some((currentItem) => currentItem.id === originalItem.id),
  );
}

export function findProjectItemById<T extends { id: string }>(items: T[] = [], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

export function hasProjectItemChanged(currentItem: any, originalItem: any): boolean {
  if (!originalItem) return true;

  return JSON.stringify(currentItem) !== JSON.stringify(originalItem);
}

export function findEquivalentProjectEmployee(employees: any[] = [], employee: any): any | undefined {
  const employeeComparable = getComparableProjectEmployee(employee);

  return employees.find((item) => {
    const itemComparable = getComparableProjectEmployee(item);
    return JSON.stringify(itemComparable) === JSON.stringify(employeeComparable);
  });
}

// Helper per confronto dei ruoli
function getComparableProjectJobRoles(roles: any[]): any[] {
  return roles
    .map((role) => getComparableProjectJobRole(role))
    .sort((left, right) => String(left.jobRole).localeCompare(String(right.jobRole)));
}

function getComparableProjectJobRole(role: any): any {
  return {
    jobRole: role.jobRole || null,
    jobRoleLevel: role.jobRoleLevel || null,
    dailyCost: normalizeComparableNumber(parseCurrencyNumber(role.dailyCost)),
    daysSpent: normalizeComparableNumber(Number(role.daysSpent || 0)),
    winProbability: normalizeComparableNumber(parseDecimalNumber(role.winProbability)),
  };
}

// Helper per confronto delle risorse
function getComparableProjectEmployees(employees: any[]): any[] {
  return employees
    .map((employee) => getComparableProjectEmployee(employee))
    .sort((left, right) => String(left.employeeId).localeCompare(String(right.employeeId)));
}

function getComparableProjectEmployee(employee: any): any {
  return {
    employeeId: employee.employeeId || null,
    jobRole: employee.jobRole || null,
    jobRoleLevel: employee.jobRoleLevel || null,
    dailyCost: normalizeComparableNumber(parseCurrencyNumber(employee.dailyCost)),
    daysSpent: normalizeComparableNumber(Number(employee.daysSpent || 0)),
    winProbability: normalizeComparableNumber(parseDecimalNumber(employee.winProbability)),
  };
}

function normalizeComparableNumber(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(6));
}

function normalizeProjectRoleForForm(role: ProjectRole, roles: LookupOption[], levels: LookupOption[]): any {
  const jobRoleId = isUuid(role.jobRole) ? role.jobRole : findOptionIdByName(roles, role.jobRole);
  const jobRoleLevelId = isUuid(role.jobRoleLevel)
    ? role.jobRoleLevel
    : findOptionIdByName(levels, role.jobRoleLevel);

  return {
    ...role,
    jobRole: jobRoleId,
    jobRoleLevel: jobRoleLevelId,
    dailyCost: role.dailyCost || 0,
    daysSpent: Number(role.daysSpent || 0),
    winProbability: role.winProbability || 0,
  };
}

function normalizeProjectEmployeeForForm(
  employee: any,
  employees: LookupOption[],
  roles: LookupOption[],
  levels: LookupOption[],
): any {
  const normalizedEmployee = {
    ...employee,
    jobRole: isUuid(employee.jobRole) ? employee.jobRole : findOptionIdByName(roles, employee.jobRole),
    jobRoleLevel: isUuid(employee.jobRoleLevel)
      ? employee.jobRoleLevel
      : findOptionIdByName(levels, employee.jobRoleLevel),
    daysSpent: Number(employee.daysSpent || 0),
  };

  if (isUuid(employee.employeeId)) {
    return normalizedEmployee;
  }

  return {
    ...normalizedEmployee,
    employeeId: findEmployeeIdByFullName(employees, employee.employee),
    dailyCost: employee.dailyCost || 0,
    winProbability: employee.winProbability || 0,
  };
}

function findOptionIdByName(options: LookupOption[], name: string | null | undefined): string | null {
  return options.find((option) => option.name === name)?.id || null;
}

function findEmployeeIdByFullName(employees: LookupOption[], fullName: string | null | undefined): string | null {
  if (!fullName) return null;

  const searchedName = fullName.trim().toLowerCase();
  const foundEmployee = employees.find((employee) => {
    const completeName = `${employee.name} ${employee.surname}`.trim().toLowerCase();
    const invertedName = `${employee.surname} ${employee.name}`.trim().toLowerCase();

    return completeName === searchedName || invertedName === searchedName;
  });

  return foundEmployee?.id || null;
}

function toDateInputValue(value: string | undefined): string {
  return value?.split('T')[0] || '';
}

function isUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
