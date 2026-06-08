import { formatEuroCurrency, parseCurrencyNumber, cleanProbability } from '../utils/project-form.utils';

export interface ProjectUpdatePayload {
  id: string;
  name: string;
  description: string;
  head: string;
  company?: string;
  customer?: string;
  projectStatus?: string;
  pm?: string;
  companyId?: string;
  customerId?: string;
  projectStatusId?: string;
  pmId?: string;
  startDate: string;
  endDate: string;
  winProbability: number;
  totalDays: number;
  totalBudget: number;
  isFavorite: boolean;
}

export interface ProjectJobRolePayload {
  jobRoleId: string | null;
  jobRoleLevelId: string | null;
  dailyCost: number;
  daysSpent: number;
  winProbability: number;
}

export interface ProjectEmployeePayload {
  employeeId: string | null;
  jobRoleId?: string | null;
  jobRoleLevelId?: string | null;
  dailyCost: number;
  daysSpent: number;
  winProbability: number;
  monthlyManagements?: any[];
}

export function buildProjectUpdatePayload(
  formData: any,
  projectId: string,
  isFavorite: boolean,
  selectedNames: {
    company?: string;
    customer?: string;
    projectStatus?: string;
    pm?: string;
  },
): ProjectUpdatePayload {
  const payload = {
    ...formData,
    id: projectId,
    company: selectedNames.company,
    customer: selectedNames.customer,
    projectStatus: selectedNames.projectStatus,
    pm: selectedNames.pm ?? formData.pm,
    isFavorite: isFavorite,
    winProbability: cleanProbability(formData.winProbability),
    totalDays: Number(formData.totalDays),
    totalBudget: parseCurrencyNumber(formData.totalBudget),
  };

  delete payload.projectJobRoles;
  delete payload.projectEmployees;

  return payload;
}

export function buildProjectJobRolePayload(role: any): ProjectJobRolePayload {
  return {
    jobRoleId: role.jobRole,
    jobRoleLevelId: role.jobRoleLevel,
    dailyCost: parseCurrencyNumber(role.dailyCost),
    daysSpent: Number(role.daysSpent),
    winProbability: cleanProbability(role.winProbability),
  };
}

export function buildProjectEmployeePayload(employee: any): ProjectEmployeePayload {
  const payload: ProjectEmployeePayload = {
    employeeId: employee.employeeId,
    dailyCost: parseCurrencyNumber(employee.dailyCost),
    daysSpent: Number(employee.daysSpent),
    winProbability: cleanProbability(employee.winProbability),
  };

  if (Object.prototype.hasOwnProperty.call(employee, 'jobRole')) {
    payload.jobRoleId = employee.jobRole || null;
  }

  if (Object.prototype.hasOwnProperty.call(employee, 'jobRoleLevel')) {
    payload.jobRoleLevelId = employee.jobRoleLevel || null;
  }

  if (Array.isArray(employee.monthlyManagements)) {
    payload.monthlyManagements = employee.monthlyManagements;
  }

  return payload;
}

export function normalizeProjectBudgetForForm(formData: any): void {
  formData.totalBudget = formatEuroCurrency(parseCurrencyNumber(formData.totalBudget));
}
