import { Employee } from '../models/employee.model';

type LookupOption = {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
};

export interface EmployeePayload {
  name: string;
  surname: string;
  jobRoleId: string | null | undefined;
  jobRoleLevelId: string | null;
  companyId: string | null;
  isActive: boolean;
}

export function buildEmployeePayload(
  formData: any,
  lookups: {
    roles?: LookupOption[];
    levels: LookupOption[];
    companies: LookupOption[];
    selectedRoleId?: string | null;
  },
): EmployeePayload {
  return {
    name: formData.name,
    surname: formData.surname,
    jobRoleId: (Object.prototype.hasOwnProperty.call(lookups, 'selectedRoleId'))
      ? lookups.selectedRoleId
      : findOptionIdByName(lookups.roles || [], formData.jobRole),
    jobRoleLevelId: findOptionIdByName(lookups.levels, formData.jobRoleLevel),
    companyId: findOptionIdByName(lookups.companies, formData.company),
    isActive: formData.isActive ?? true,
  };
}

export function buildEmployeeUiFallback(formData: any, fallbackId: string): Employee {
  return {
    id: formData.id || fallbackId,
    name: formData.name,
    surname: formData.surname,
    jobRole: formData.jobRole,
    jobRoleLevel: formData.jobRoleLevel,
    company: formData.company,
    isActive: formData.isActive ?? true,
    isEliminated: formData.isEliminated ?? false,
  };
}

function findOptionIdByName(options: LookupOption[], value: string | null | undefined): string | null {
  if (!value) return null;

  const normalizedValue = value.trim().toLowerCase();
  const option = options.find((item) => {
    const name = item.name || item.Name || '';
    return name.trim().toLowerCase() === normalizedValue;
  });

  return option?.id || option?.Id || null;
}
