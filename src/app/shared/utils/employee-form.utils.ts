import { Employee } from '../models/employee.model';

export type AssignableEmployee = Employee & {
  selectedJobRoleLevel: string;
};

export function normalizeEmployeeForForm(employee: any): Employee {
  return {
    id: employee?.id || employee?.Id || employee?.ID || '',
    name: employee?.name || employee?.Name || '',
    surname: employee?.surname || employee?.Surname || '',
    jobRole: employee?.jobRole || employee?.JobRole || '',
    jobRoleLevel: employee?.jobRoleLevel || employee?.JobRoleLevel || '',
    company: employee?.company || employee?.Company || '',
    isActive:
      employee?.isActive !== undefined
        ? employee.isActive
        : employee?.IsActive !== undefined
          ? employee.IsActive
          : true,
  };
} // Tipo di formato dati per i form della schermata Risorse

export function getEmployeeFullName(employee: Employee): string {
  return `${employee.name || ''} ${employee.surname || ''}`.trim();
} // ritorna nome e cognome insieme come unica stringa

export function mapAssignedEmployeesToSelected(employees: Employee[]): AssignableEmployee[] {
  return employees.map((employee) => ({
    ...employee,
    selectedJobRoleLevel: employee.jobRoleLevel || '',
  }));
}

export function isAssignableEmployeeComplete(employee: AssignableEmployee): boolean {
  return !!employee.id && !!employee.selectedJobRoleLevel;
}
