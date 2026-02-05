import { inject, Injectable, signal } from '@angular/core';
import { EMPTY, catchError, map, tap, throwError, of } from 'rxjs';
import { Progetto } from '../progetti/progetto/progetto.model';
import { ModelloCliente } from '../clienti/cliente/cliente.model';
import { HttpClient } from '@angular/common/http';
import { ErrorService } from './error.service';
import { environment } from '../../environments/environment.development';
import { CardModel } from '../grid/card-home/card-home.model';

@Injectable({
  providedIn: 'root',
})
export class RequestsService {
  private errorService = inject(ErrorService);

  private httpClient = inject(HttpClient);

  private Progetti = signal<Progetto[]>([]);

  private Clienti = signal<ModelloCliente[]>([]);

  private Cards = signal<CardModel[]>([]);

  progettiCaricati = this.Progetti.asReadonly();

  clientiCaricati = this.Clienti.asReadonly();

  cardsCaricate = this.Cards.asReadonly();

  caricaProgettiDisponibili() {
    return this.fetchProgetti(
      `${environment.apiUrl}/projects`,
      'Qualcosa è andato storto. Riprova più tardi.',
    ).pipe(
      tap({
        next: (progetti) => this.Progetti.set(progetti),
      }),
    );
  }

  caricaProgettoById(id: string) {
  const cached = this.Progetti().find(p => p.id === id);
  if (cached) {
    return of(cached);
  }

  return this.fetchProgettoById(
    `${environment.apiUrl}/projects/${encodeURIComponent(id)}`,
    'Qualcosa è andato storto. Riprova più tardi.',
  ).pipe(
    tap({
      next: (p) => {
        const prev = this.Progetti();
        const next = prev.some(x => x.id === p.id)
          ? prev.map(x => (x.id === p.id ? p : x))
          : [...prev, p];
        this.Progetti.set(next);
      },
    }),
  );
}

  caricaClientiDisponibili() {
    return this.fetchClienti(
      `${environment.apiUrl}/customers`,
      'Qualcosa è andato storto. Riprova più tardi.',
    ).pipe(
      tap({
        next: (clienti) => this.Clienti.set(clienti),
      }),
    );
  }

  aggiornaProgetto(progetto: Progetto) {
    const payload = this.toProjectPayload(progetto);

    return this.httpClient.put(`${environment.apiUrl}/projects/${progetto.id}`, payload).pipe(
      tap(() => {
        // Aggiorna il segnale locale per riflettere le modifiche immediatamente nella tabella
        this.Progetti.update(prev => prev.map(p => p.id === progetto.id ? progetto : p));
      }),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'aggiornamento.');
        return throwError(() => error);
      })
    );
  }

  aggiungiNuovoProgetto(progetto: Progetto) {
    const progettiPrecedenti = this.Progetti();

    if (!progettiPrecedenti.some((p) => p.id === progetto.id)) {
      this.Progetti.set([...progettiPrecedenti, progetto]);
    }

    const payload = this.toProjectPayload(progetto) as any;
    delete payload.id;

    return this.httpClient
      .post<Progetto>(`${environment.apiUrl}/projects`, payload)
      .pipe(
        tap((created) => {
          if (created?.id) {
            this.Progetti.update(prev =>
              prev.map(p => (p.id === progetto.id ? created : p))
            );
          }
        }),
        catchError((error) => {
          this.Progetti.set(progettiPrecedenti);
          this.errorService.showError('Inserimento fallito.');
          return throwError(() => error);
        }),
      );
  }

  aggiungiNuovoCliente(cliente: ModelloCliente) {
    const clientiPrecedenti = this.Clienti();

    if (!clientiPrecedenti.some((c) => c.id === cliente.id)) {
      this.Clienti.set([...clientiPrecedenti, cliente]);
    }

    return this.httpClient
      .put(`${environment.apiUrl}/customers/${cliente.id}`, {
        customerId: cliente.id,
      })
      .pipe(
        catchError((error) => {
          this.Clienti.set(clientiPrecedenti);
          this.errorService.showError('Inserimento fallito.');
          return throwError(() => error);
        }),
      );
  }

  // removeProgetto(progetto: Progetto) {

  //     const progettiPrecedenti = this.Progetti();
  //     if (progettiPrecedenti.length === 0) {
  //     return EMPTY; // Return an EMPTY observable instead of undefined
  //     }

  //     if (progettiPrecedenti.some((p) => p.Id === progetto.Id)) {
  //     this.Progetti.set(progettiPrecedenti.filter((p) => p.Id !== progetto.Id));
  //     }

  //     return this.httpClient.delete("http://localhost:3000/user-places/" + progetto.Id)
  //         .pipe(
  //         catchError(error => {
  //             this.Progetti.set(progettiPrecedenti);
  //             this.errorService.showError('Failed to delete the selected place.');
  //             return throwError(() => new Error('Failed to delete the selected place.'));
  //         })
  //     );

  // } chiedere per quanto riguarda un eventuale richiesta http DELETE per progetti

  private fetchProgetti(url: string, errorMessage: string) {
    return this.httpClient.get<any[]>(url).pipe(
      tap((resData) => {
        console.log('Risposta dal backend:', resData); // Log per verificare la risposta
      }),
      map((projects) =>
        projects.map((project) => ({
          id: project.id,
          activity: project.activity,
          description: project.description,
          head: project.head,
          company: project.company || 'N/A',
          pm: project.pm || 'N/A',
          startDate: project.startDate || '',
          endDate: project.endDate || '',
          totalDays: project.totalDays,
          winProbability: project.winProbability
            ? project.winProbability * 100
            : 0,
          projectEmployees: project.projectEmployees || [],
          projectJobRoles: project.projectJobRoles || [],
          projectStatus: project.projectStatus || 'Initiation',
          customer: project.customer || 'N/A',
          totalBudget: project.totalBudget || 0,
        })),
      ),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  private fetchProgettoById(url: string, errorMessage: string) {
    return this.httpClient.get<any>(url).pipe(
      tap((resData) => console.log('Risposta dal backend (byId):', resData)),
      map((project) => ({
        id: project.id,
        activity: project.activity,
        description: project.description,
        head: project.head,
        company: project.company || 'N/A',
        pm: project.pm || 'N/A',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        totalDays: project.totalDays,
        winProbability: project.winProbability ? project.winProbability * 100 : 0,
        projectEmployees: project.projectEmployees || [],
        projectJobRoles: project.projectJobRoles || [],
        projectStatus: project.projectStatus || 'Initiation',
        customer: project.customer || 'N/A',
        totalBudget: project.totalBudget || 0,
      })),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }


  private fetchClienti(url: string, errorMessage: string) {
    return this.httpClient.get<any[]>(url).pipe(
      tap((resData) => {
        console.log('Risposta dal backend:', resData); // Log per verificare la risposta
      }),
      map((customers) =>
        customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          fullAddress: customer.fullAddress,
          projects: customer.projects ? customer.projects.length : 0,
        })),
      ),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  //GET PER HOME (grid component)

  private fetchCards(url: string, errorMessage: string) {
    return this.httpClient.get<any[]>(url).pipe(
      tap((resData) => {
        console.log('Risposta dal backend:', resData);
      }),
      map((summary) =>
        summary.map((card) => ({
          customer: card.customer,
          activity: card.activity,
          projectStatus: card.projectStatus,
          employeeCount: card.assignmentSummary?.employeesCount,
          totalBudget: card.totalBudget,
        })),
      ),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  getCards() {
    return this.fetchCards(
      `${environment.apiUrl}/projects/summary`,
      'Qualcosa è andato storto. Riprova più tardi.',
    ).pipe(
      tap({
        next: (cards) => this.Cards.set(cards),
      }),
    );
  }
  private toProjectPayload(progetto: Progetto) {
    const projectStatusId = (progetto as any).projectStatusId ?? (progetto as any).projectStatus;
    const customerId = (progetto as any).customerId ?? (progetto as any).customer;
    const companyId = (progetto as any).companyId ?? (progetto as any).company;
    const pmId = (progetto as any).pmId ?? (progetto as any).pm;

    return {
      activity: progetto.activity,
      description: progetto.description,
      projectStatusId,
      customerId,
      head: progetto.head,
      companyId,
      pmId,
      startDate: this.toBackendDate(progetto.startDate),
      endDate: this.toBackendDate(progetto.endDate),
      totalDays: this.toNumber(progetto.totalDays),
      winProbability: this.normalizeWinProbability(this.toNumber(progetto.winProbability)),
    };
  }

  private normalizeWinProbability(value: number): number {
    if (!Number.isFinite(value)) return value;
    return value > 1 ? value / 100 : value;
  }

  private toBackendDate(value: string): string {
    if (!value) return value;
    if (value.includes('T')) return value;
    const [y, m, d] = value.split('-').map((v) => Number(v));
    if (!y || !m || !d) return value;
    return new Date(Date.UTC(y, m - 1, d)).toISOString();
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return NaN;
    const raw = String(value).trim().replace(',', '.');
    const num = Number(raw);
    return Number.isFinite(num) ? num : NaN;
  }
}
