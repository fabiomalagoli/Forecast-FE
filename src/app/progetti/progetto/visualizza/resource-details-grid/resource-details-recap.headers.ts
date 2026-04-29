import { ResourceDetailsRecap } from "./resource-details-recap.model";

export const RISORSE_DETAILS_RECAP_HEADERS: Partial<Record<keyof ResourceDetailsRecap, string>> = {
    BudgetTotale: 'Budget Totale',
    TotaleRicavi: 'Totale Ricavi',
    BudgetWin: 'Budget Win',
    TotaleConsuntivate: 'Totale Consuntivate',
    Delta: 'Delta',
    CostoGiornaliero: 'Costo Giornaliero',
};
