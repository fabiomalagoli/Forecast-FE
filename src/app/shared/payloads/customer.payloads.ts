import { Customer } from '../models/customer.model';
import { Project } from '../models/project.model';

// Payload per creare o aggiornare un Cliente
export interface CustomerPayload {
  vatNumber: string;
  name: string;
  fullAddress?: string;
  address?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  country?: string;
}

// Payload ridotto per i progetti associati al cliente
export interface CustomerProjectSummaryPayload {
  id: string;
  name: string;
  company: string;
  projectStatus: string;
  totalBudget: number;
  description?: string;
}

export function buildCustomerPayload(formData: any): CustomerPayload {
  return {
    vatNumber: formData.vatNumber,
    name: formData.name,
    address: formData.address,
    streetNumber: formData.streetNumber,
    postalCode: formData.postalCode,
    city: formData.city,
    province: formData.province,
    country: formData.country,
  };
}

// Builder per il progetto (versione ridotta per il contesto del cliente)
export function buildCustomerProjectPayload(formData: any): CustomerProjectSummaryPayload {
  return {
      id: formData.id || formData.Id, 
      name: formData.name || formData.Name,
      company: formData.company || formData.Company, 
      projectStatus: formData.projectStatus || formData.ProjectStatus,
      totalBudget: formData.totalBudget || formData.TotalBudget,
      description: formData.description || formData.Description
  };
}