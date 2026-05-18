import { Company } from "./company.model";

export interface Employee {
    id: string;
    name: string;
    surname: string;
    jobRole: string; // Es. "Full-stack developer"
    jobRoleLevel: string; // Es. "Junior", "Middle", "Senior"
    company: string;
    isActive: boolean;
}