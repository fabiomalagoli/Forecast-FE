//Headers per la tabella dei progetti e per la visualizzazione dettagliata del progetto
import { Progetto } from './progetto.model';

export const PROGETTO_COMPLETO_HEADERS: Partial<Record<keyof Progetto, string>> = {
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
