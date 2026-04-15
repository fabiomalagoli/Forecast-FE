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
  projectEmployees: string[]; // array di ID (vuoto nel JSON)
  projectJobRoles: ProjectRole[];
  activity: string;
  projectStatus:
    | 'Initiation'
    | 'Planning'
    | 'Execution'
    | 'Monitoring'
    | 'Closing';
  customer: string;
  companyId?: string;
  pmId?: string;
  customerId?: string;
  projectStatusId?: string;
  totalBudget: number;
}
