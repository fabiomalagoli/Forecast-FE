//Headers per la tabella dei progetti e per la visualizzazione dettagliata del progetto
import { CustomerProjectSummaryPayload } from "../../../../shared/payloads/customer.payloads"

export const CUSTOMER_PROJECT_HEADERS: Partial<Record<keyof CustomerProjectSummaryPayload, string>> = {
  company: 'Azienda',
  description: 'Descrizione',
  totalBudget: 'Budget Totale',
  projectStatus: 'Stato',
  year: 'Anno'
};
