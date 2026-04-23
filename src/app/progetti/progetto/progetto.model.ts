import { ProjectEmployee } from "./progetto-employee.model";
import { ProjectRole } from "./project-role.model";

export interface Progetto {
  id: string;
  description: string;
  head: string;
  //Id per PUT: companyId, pmId, customerId, projectStatusId; correlazione con il ProjectForManipulationDto lato backend
  company: string;
  pm: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  winProbability: number;
  projectEmployees: ProjectEmployee[]; // array di ID (vuoto nel JSON)
  projectJobRoles: ProjectRole[];
  name: string;
  projectStatus: string;
  customer: string;
  companyId?: string;
  pmId?: string;
  customerId?: string;
  projectStatusId?: string;
  totalBudget: number;
}
