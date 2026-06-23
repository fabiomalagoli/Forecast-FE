export interface Role {
  id: string;
  name: string;
  isEliminated: boolean;
}

export interface CreateRoleRequest {
  name: string;
}
