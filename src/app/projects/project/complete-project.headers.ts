//Headers per la tabella dei progetti e per la visualizzazione dettagliata del progetto
import { Project } from '../../shared/models/project.model';

export const COMPLETE_PROJECT_HEADERS: Partial<Record<keyof Project, string>> = {
  company: 'Azienda',
  customer: 'Cliente',
  pm: 'PM',
  head: 'Referente',
  name: 'Nome',
  description: 'Descrizione',
  totalBudget: 'Budget Totale',
  projectStatus: 'Stato',
  startDate: 'Data Inizio',
  endDate: 'Data Fine',
  totalDays: 'Giorni',
  winProbability: 'Win %',
  projectEmployees: 'Risorse',
  projectJobRoles: 'Ruoli',
  id: 'ID',
};
