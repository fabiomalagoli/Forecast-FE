import { Employee } from '../models/employee.model';
import { Project, ProjectEmployee } from '../models/project.model';
import { Role } from '../models/role.model';

export function mergeProjectsWithEmployeeDetails(
  projects: Project[],
  employees: Employee[],
  roles: Role[] = [],
): Project[] {
  return projects.map((project) => ({
    ...project,
    projectEmployees: mergeProjectEmployeesWithEmployeeDetails(
      project.projectEmployees || [],
      employees,
      roles,
    ),
  }));
}

export function mergeProjectEmployeesWithEmployeeDetails(
  projectEmployees: ProjectEmployee[],
  employees: Employee[],
  roles: Role[] = [],
): ProjectEmployee[] {
  return projectEmployees.map((projectEmployee) => {
    const employeeInfo = findEmployeeForProjectEmployee(projectEmployee, employees);

    if (!employeeInfo) {
      return projectEmployee;
    }

    return {
      ...projectEmployee,
      jobRole: resolveRoleName(employeeInfo.jobRole, roles) || projectEmployee.jobRole,
      jobRoleLevel: employeeInfo.jobRoleLevel || projectEmployee.jobRoleLevel,
    };
  });
}

function findEmployeeForProjectEmployee(projectEmployee: any, employees: Employee[]): Employee | undefined {
  const actualEmployeeId = projectEmployee.employeeId
    || projectEmployee.employee?.id
    || projectEmployee.id;

  const employeeById = employees.find((employee) => String(employee.id) === String(actualEmployeeId));
  if (employeeById) {
    return employeeById;
  }

  if (!projectEmployee.employee) {
    return undefined;
  }

  const projectEmployeeName = normalizeName(projectEmployee.employee);

  return employees.find((employee) =>
    projectEmployeeName === normalizeName(`${employee.name} ${employee.surname}`)
    || projectEmployeeName === normalizeName(`${employee.surname} ${employee.name}`)
  );
}

function resolveRoleName(roleValue: string | null | undefined, roles: Role[]): string | null {
  if (!roleValue) {
    return null;
  }

  const roleMatch = roles.find((role) =>
    String(role.id) === String(roleValue)
    || String(role.name || '').trim().toLowerCase() === String(roleValue).trim().toLowerCase()
  );

  return roleMatch?.name || roleValue;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}
