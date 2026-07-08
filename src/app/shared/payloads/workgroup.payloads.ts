import { CreateWorkGroupRequest, UpdateWorkGroupRequest } from "../models/workgroup.model";

export function buildUpdateWorkGroupPayload(formData: any, fallbackId: string): UpdateWorkGroupRequest {
  return {
    id: formData.id || fallbackId,
    name: formData.name,
    employeeIds: formData.employeeIds || []
  };
}

export function buildCreateWorkGroupPayload(formData: any): CreateWorkGroupRequest {
  return {
    name: formData.name,
    employeeIds: formData.employeeIds || []
  };
}