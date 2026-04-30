import { Company } from "../shared/company.model";

export interface Employee {
    id: string;
    name: string;
    surname: string;
    jobRole: string; // Es. "Full-stack developer"
    jobRoleLevel: string; // Es. "Junior", "Middle", "Senior"
    Company: string;
    isActive: boolean;
}