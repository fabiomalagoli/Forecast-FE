export interface JobRole {
  id: string;
  name: string;
  isEliminated: boolean;
}

export interface CreateJobRoleRequest {
  name: string;
}
