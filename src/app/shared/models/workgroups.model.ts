import { Employee } from "./employee.model";

export interface EmployeeInGroup {
  employeeId: string;
  fullName: string;
}

export interface WorkGroup {
  id: string;
  name: string;
  employees: EmployeeInGroup[];
}

export interface CreateWorkGroupRequest {
  name: string;
  employeeIds: string[];
}

export interface UpdateWorkGroupRequest {
  id: string;
  name: string;
  employeeIds: string[];
}