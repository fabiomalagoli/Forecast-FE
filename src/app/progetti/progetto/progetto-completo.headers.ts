//Headers per la tabella dei progetti e per la visualizzazione dettagliata del progetto
import { Progetto } from './progetto.model';

export const PROGETTO_COMPLETO_HEADERS: Partial<Record<keyof Progetto, string>> = {
  company: 'Azienda',
  pm: 'PM',
  customer: 'Cliente',
  head: 'Referente',
  activity: 'Attività',
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
