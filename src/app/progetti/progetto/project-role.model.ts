export interface ProjectRole {
  id: string;
  project: string;
  jobRole: string; // Es. "Full-stack developer"
  jobRoleLevel: 'Junior' | 'Middle' | 'Senior';
  dailyCost: number;
  daysSpent: number;
  effort: number;   
  winProbability: number;
}
