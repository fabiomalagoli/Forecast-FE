export interface EmployeeInGroup {
  employeeId: string;
  fullName: string;
}

export interface WorkGroup {
  id: string;
  name: string;
  employees: EmployeeInGroup[];
  ownerId?: string;
  members?: GroupMember[];
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

export interface GroupMember {
  groupId: string;
  userId: string;
  role: string;
}
