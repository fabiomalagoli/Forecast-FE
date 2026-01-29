export interface ProjectRole {
  id: string;
  project: string;
  role: string; // Es. "Full-stack developer"
  roleLevel: 'Junior' | 'Middle' | 'Senior';
  dailyCost: number;
  daysSpent: number;
  effort: number;   
  winProbability: number;
}