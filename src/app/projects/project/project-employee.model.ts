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
}
