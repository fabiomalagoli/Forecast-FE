import { Progetto } from './progetto.model';

 export const PROGETTO_HEADERS: Record<keyof Progetto, string> = {
    Attivita: 'Attività',
    Descrizione: 'Descrizione',
    Status: 'Stato',
    Cliente: 'Cliente',
    Referente: 'Referente',
    Azienda: 'Azienda',
    PM: 'Project Manager',
    Giorni: 'Giorni',
    winPercentual: 'Win %',
    }; // Record per inserire i titoli (headers) dei dati della tabella Progetti corrispondenti ai parametri del tipo Progetto