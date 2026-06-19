export const EMPLOYEES_HEADERS_FORM = {
    id: 'ID',
    name: 'Nome',
    surname: 'Cognome',
    jobRole: 'Ruolo',
    jobRoleLevel: 'Livello',
    company: 'Azienda',
    isActive: 'Attivo',
};

const { id, name, surname, jobRole, ...rest } = EMPLOYEES_HEADERS_FORM;

export const EMPLOYEES_HEADERS_TABLE = {
    id,
    name,
    surname,
    jobRole,
    employee: 'Risorsa',
    ...rest,
} as const;