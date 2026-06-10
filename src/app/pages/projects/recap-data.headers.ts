import { RecapDataHeaders } from "./recap-data.model";

export const RECAP_DATA_HEADERS: Partial<Record<keyof RecapDataHeaders, string>> = {
    BudgetTotale: 'Budget Totale',
    TotaleRicavi: 'Totale Ricavi',
    BudgetWin: 'Budget Win',
    TotaleConsuntivate: 'Totale Consuntivate',
    Delta: 'Delta',
    Tariffa: 'Tariffa',
};
