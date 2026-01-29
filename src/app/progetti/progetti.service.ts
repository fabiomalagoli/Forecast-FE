// import { Injectable } from "@angular/core";
// import { Progetto } from "./progetto/progetto.model";

// @Injectable({ providedIn: 'root' })
// export class ProgettiService {
//     private Progetti: Progetto[] = [
//         {
//             id: '1',
//             activity: 'Sviluppo Portale Web',
//             description: 'Realizzazione portale web aziendale responsive',
//             status: 'In Corso',
//             customer: 'ACME S.p.A.',
//             head: 'Mario Rossi',
//             company: 'Tech Solutions',
//             pm: 'Laura Bianchi',
//             totalDays: 45,
//             winProbability: 80,
//         },
//         {
//             id: '2',
//             activity: 'App Mobile',
//             description: 'Sviluppo app mobile iOS e Android',
//             status: 'Bozza',
//             customer: 'Beta Group',
//             head: 'Giulia Verdi',
//             company: 'Digital Labs',
//             pm: 'Andrea Neri',
//             totalDays: 60,
//             winProbability: 55,
//         },
//         {
//             id: '3',
//             activity: 'Migrazione Cloud',
//             description: 'Migrazione infrastruttura su cloud AWS',
//             status: 'Completato',
//             customer: 'Omega Corp',
//             head: 'Paolo Conti',
//             company: 'Cloud Experts',
//             pm: 'Francesca Moretti',
//             totalDays: 30,
//             winProbability: 100,
//         },
//         {
//             id: '4',
//             activity: 'CRM Custom',
//             description: 'Personalizzazione CRM per rete vendita',
//             status: 'In Attesa',
//             customer: 'Nova Retail',
//             head: 'Elena Ricci',
//             company: 'Business IT',
//             pm: 'Marco De Luca',
//             totalDays: 20,
//             winProbability: 40,
//         },
//         {
//             id: '5',
//             activity: 'Data Analysis',
//             description: 'Analisi dati e dashboard KPI',
//             status: 'In Corso',
//             customer: 'FinCorp',
//             head: 'Stefano Lombardi',
//             company: 'Analytics Pro',
//             pm: 'Chiara Romano',
//             totalDays: 25,
//             winProbability: 70,
//         },
//     ];

//     PROGETTO_HEADERS: Record<keyof Progetto, string> = {
//         id: 'Id',
//         activity: 'Attività',
//         description: 'Descrizione',
//         status: 'Stato',
//         customer: 'Cliente',
//         head: 'Referente',
//         company: 'Azienda',
//         pm: 'Project Manager',
//         totalDays: 'Giorni',
//         winProbability: 'Win %',
//     }; // Record per inserire i titoli (headers) dei dati della tabella Progetti corrispondenti ai parametri del tipo Progetto

//     getProgetti() {
//         return this.Progetti;
//     }

//     getClienteForProgetti(cliente: string) {
//         return this.Progetti.filter((progetto) => progetto.customer == cliente);
//     }

//     aggiungiProgetto(newProgetto: Progetto) {
//         this.Progetti = [...this.Progetti, newProgetto];
//     }
// }