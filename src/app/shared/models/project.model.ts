import { MonthlyManagement } from "./monthly-management.model";

export interface Project {
  id: string;
  description: string;
  head: string;
  //Id per PUT: companyId, pmId, customerId, projectStatusId; correlazione con il ProjectForManipulationDto lato backend
  company: string;
  pm: string;
  startDate: string;
  endDate: string;
  year: number
  totalDays: number;
  winProbability: number;
  projectEmployees: ProjectEmployee[]; // array di ID (vuoto nel JSON)
  projectJobRoles: ProjectRole[];
  name: string;
  projectStatus: string;
  customer: string;
  companyId?: string;
  pmId?: string;
  ownerId?: string;
  members?: ProjectMember[];
  customerId?: string;
  projectStatusId?: string;
  totalBudget: number;
  isFavorite: boolean;
  isEliminated: boolean;
}


export interface ProjectEmployee {
  id: string;
  employee: string;
  isActive: boolean;
  project: string;
  jobRole: string; // Es. "Full-stack developer"
  jobRoleLevel: string; // Es. "Junior", "Middle", "Senior"
  dailyCost: number;
  daysSpent: number;
  effort: number;   
  winProbability: number;
  monthlyManagements?: MonthlyManagement[];
}

export interface RecapData {
  totalRevenues: number;
  budgetTotaleRisorsa: number;
  delta: number;
  budgetWin: number;
  totalEmployedDays: number;
}


export interface ProjectRole {
  id: string;
  project: string;
  jobRole: string; // Es. "Full-stack developer"
  jobRoleLevel: string; // Es. "Junior", "Middle", "Senior"
  dailyCost: number;
  daysSpent: number;
  effort: number;   
  winProbability: number;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: string;
}
