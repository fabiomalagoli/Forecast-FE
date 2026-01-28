export interface Progetto {
  id: string; // Guid dal backend
  activity: string; // Activity dal backend
  description?: string; // Description dal backend
  status: string; // Stato del progetto
  customer: string; // Cliente
  head?: string; // Referente
  company: string; // Azienda
  pm: string; // Project Manager
  totalDays?: number; // Giorni totali
  winProbability?: number; // Win %
}