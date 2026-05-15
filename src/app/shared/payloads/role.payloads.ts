import { CreateRoleRequest, Role } from '../models/role.model';

export function buildCreateRolePayload(formData: any): CreateRoleRequest {
  return {
    name: formData.name,
  };
}

export function buildUpdateRolePayload(formData: any, fallbackId: string): Role {
  return {
    id: formData.id || fallbackId,
    name: formData.name,
  };
}
