import { EmployeeDetailsRecap } from "./employee-details-recap.model";

export const EMPLOYEES_DETAILS_RECAP_HEADERS: Partial<Record<keyof EmployeeDetailsRecap, string>> = {
    BudgetTotale: 'Budget Totale',
    TotaleRicavi: 'Totale Ricavi',
    BudgetWin: 'Budget Win',
    TotaleConsuntivate: 'Totale Consuntivate',
    Delta: 'Delta',
    Tariffa: 'Tariffa',
};
