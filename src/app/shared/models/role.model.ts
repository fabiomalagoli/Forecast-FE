export interface Role {
  id: string;
  name: string;
  isDefault: string;
  isEliminated: boolean;
}

export interface CreateRoleRequest {
  name: string;
}
