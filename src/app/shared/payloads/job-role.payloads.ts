import { CreateJobRoleRequest, JobRole } from '../models/job-role.model';

export function buildCreateJobRolePayload(formData: any): CreateJobRoleRequest {
  return {
    name: formData.name,
  };
}

export function buildUpdateJobRolePayload(formData: any, fallbackId: string): JobRole {
  return {
    id: formData.id || fallbackId,
    name: formData.name,
    isEliminated: formData.isEliminated ?? formData.IsEliminated ?? false
  };
}
