import { inject, Injectable, signal } from '@angular/core';
import { EMPTY, catchError, map, tap, throwError, of, Observable } from 'rxjs';
import { Progetto } from '../progetti/progetto/progetto.model';
import { Cliente } from '../clienti/cliente/cliente.model';
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

  private Clienti = signal<Cliente[]>([]);

  private Aziende = signal<{ id: string; name: string; isDefault: boolean }[]>([]);

  private JobRoles = signal<{ id: string; name: string; isDefault: boolean }[]>([]);

  private StatiProgetto = signal<{ id: string; name: string; isDefault: boolean }[]>([]);

  private JobRoleLevels = signal<{ id: string; name: string; isDefault: boolean }[]>([]);

  private Cards = signal<CardModel[]>([]);

  progettiCaricati = this.Progetti.asReadonly();

  clientiCaricati = this.Clienti.asReadonly();

  aziendeCaricate = this.Aziende.asReadonly();

  jobRolesCaricati = this.JobRoles.asReadonly();

  statiProgettoCaricati = this.StatiProgetto.asReadonly();

  jobRoleLevelsCaricati = this.JobRoleLevels.asReadonly();

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

  caricaProgettoById(id: string): Observable<Progetto> {
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

  caricaClienteById(id: string): Observable<Cliente> {
    const cached = this.Clienti().find(c => c.id === id);
    if (cached) {
      return of(cached);
    }

    return this.fetchClienteById(
      `${environment.apiUrl}/customers/${encodeURIComponent(id)}`,
      'Qualcosa è andato storto. Riprova più tardi.',
    ).pipe(
      tap({
        next: (c) => {
          const prev = this.Clienti();
          const next = prev.some(x => x.id === c.id)
            ? prev.map(x => (x.id === c.id ? c : x))
            : [...prev, c];
          this.Clienti.set(next);
        },
      }),
    );
  }

  aggiornaProgetto(progetto: Progetto) {
    const payload = this.toProjectPayload(progetto);
    return this.httpClient.put(`${environment.apiUrl}/projects/${progetto.id}`, payload).pipe(
      tap(() => {
        this.Progetti.update(prev => 
          prev.map(p => p.id === progetto.id 
            ? {...p, ...progetto }
            : p
          )
        );
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

  aggiungiNuovoCliente(cliente: Cliente) {
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
          companyId: project.companyId ?? project.companyId,
          pmId: project.pmId ?? project.pmId,
          customerId: project.customerId ?? project.customerId,
          projectStatusId: project.projectStatusId ?? project.projectStatusId,
          totalBudget: project.totalBudget || 0,
        })),
      ),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  private fetchProgettoById(url: string, errorMessage: string): Observable<Progetto> {
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
        companyId: project.companyId ?? project.companyId,
        pmId: project.pmId ?? project.pmId,
        customerId: project.customerId ?? project.customerId,
        projectStatusId: project.projectStatusId ?? project.projectStatusId,
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
          vatNumber: customer.vatNumber,
          name: customer.name,
          fullAddress: customer.fullAddress,
          address: customer.address ?? customer.fullAddress,
          streetNumber: customer.streetNumber,
          postalCode: customer.postalCode,
          city: customer.city,
          province: customer.province,
          country: customer.country,
          projects: customer.projects ? customer.projects.length : 0,
          activeProjects: customer.projects || [],
        })),
      ),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  private fetchClienteById(url: string, errorMessage: string): Observable<Cliente> {
    return this.httpClient.get<any>(url).pipe(
      tap((resData) => console.log('Risposta dal backend (byId):', resData)),
      map((customer) => ({
        id: customer.id,
        vatNumber: customer.vatNumber,
        name: customer.name,
        fullAddress: customer.fullAddress,
        address: customer.address ?? customer.fullAddress,
        streetNumber: customer.streetNumber,
        postalCode: customer.postalCode,
        city: customer.city,
        province: customer.province,
        country: customer.country,
        projects: customer.projects ? customer.projects.length : 0,
        activeProjects: customer.projects || [],
      })),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  //GET PER PROGETTI PER CLIENTE (visualizza progetti attivi cliente)

  caricaProgettiAttiviCliente(clienteId: string) {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/customers/${encodeURIComponent(clienteId)}/projects`).pipe(
      tap((resData) => {
        console.log('Risposta dal backend (progetti attivi cliente):', resData);
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
          winProbability: project.winProbability ? project.winProbability * 100 : 0,
          projectEmployees: project.projectEmployees || [],
          projectJobRoles: project.projectJobRoles || [],
          projectStatus: project.projectStatus || 'Initiation',
          customer: project.customer || 'N/A',
          companyId: project.companyId ?? project.companyId,
          pmId: project.pmId ?? project.pmId,
          customerId: project.customerId ?? project.customerId,
          projectStatusId: project.projectStatusId ?? project.projectStatusId,
          totalBudget: project.totalBudget || 0,
        })),
      ),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  aggiornaCliente(cliente: Cliente) {
    return this.httpClient.put(`${environment.apiUrl}/customers/${cliente.id}`, {
      vatNumber: cliente.vatNumber,
      name: cliente.name,
      address: cliente.address,
      streetNumber: cliente.streetNumber,
      postalCode: cliente.postalCode,
      city: cliente.city,
      province: cliente.province,
      country: cliente.country,
    }).pipe(
      catchError((error) => {
        this.errorService.showError('Errore durante l\'aggiornamento.');
        return throwError(() => error);
      }),
    );
  }


  //Metodo GET per Aziende, PM e Clienti per dropdown nei form di inserimento/modifica progetto

  CaricaAziende() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/companies`).pipe(
      tap((resData) => {
        console.log('Risposta dal backend (aziende):', resData);
      }),
      map((companies) => companies.map(
        (company) => ({
          id: company.id,
          name: company.name,
          isDefault: company.isDefault,
        })
      )),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  CaricaAziendeById(id: string) {
    return this.httpClient.get<any>(`${environment.apiUrl}/companies/${encodeURIComponent(id)}`).pipe(
      tap((resData) => console.log('Risposta dal backend (azienda byId):', resData)), 
      map((company) => ({
        id: company.id,
        name: company.name,
        isDefault: company.isDefault,
      })),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  CaricaProjectStatus() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projectstatus`).pipe(
      tap((resData) => {  
        console.log('Risposta dal backend (project status):', resData);
      }),
      map((statusList) => statusList.map(
        (status) => ({
          id: status.id,
          name: status.name,
          isDefault: status.isDefault,
        })
      )),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  CaricaProjectStatusById(id: string) {
    return this.httpClient.get<any>(`${environment.apiUrl}/projectstatus/${encodeURIComponent(id)}`).pipe(
      tap((resData) => console.log('Risposta dal backend (project status byId):', resData)),
      map((status) => ({
        id: status.id,
        name: status.name,
        isDefault: status.isDefault,
      })),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  caricaJobRoles() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/jobroles`).pipe(
      tap((resData) => {
        console.log('Risposta dal backend (job roles):', resData);
      }),
      map((roles) => roles.map(
        (role) => ({
          id: role.id,
          name: role.name,
          isDefault: role.isDefault,
        })
      )),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  caricaJobRoleById(id: string) {
    return this.httpClient.get<any>(`${environment.apiUrl}/jobroles/${encodeURIComponent(id)}`).pipe(
      tap((resData) => console.log('Risposta dal backend (job role byId):', resData)),
      map((role) => ({
        id: role.id,
        name: role.name,
        isDefault: role.isDefault,
      })),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  caricaJobRoleLevels() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/jobrolelevels`).pipe(
      tap((resData) => {
        console.log('Risposta dal backend (job role levels):', resData);
      }),
      map((levels) => levels.map(
        (level) => ({
          id: level.id,
          name: level.name,
          isDefault: level.isDefault,
        })
      )),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  caricaJobRoleLevelById(id: string) {
    return this.httpClient.get<any>(`${environment.apiUrl}/jobrolelevels/${encodeURIComponent(id)}`).pipe(
      tap((resData) => console.log('Risposta dal backend (job role level byId):', resData)),
      map((level) => ({
        id: level.id,
        name: level.name,
        isDefault: level.isDefault,
      })),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  caricaEmployees() {

    this.CaricaAziende().subscribe({
      next: (aziende) => this.Aziende.set(aziende),
      error: (err) => console.log('Errore caricamento aziende:', err),
    });
    this.caricaJobRoles().subscribe({
      next: (roles) => this.JobRoles.set(roles),
      error: (err) => console.log('Errore caricamento job roles:', err),
    });
    this.caricaJobRoleLevels().subscribe({
      next: (levels) => this.JobRoleLevels.set(levels),
      error: (err) => console.log('Errore caricamento job role levels:', err),
    });

    return this.httpClient.get<any[]>(`${environment.apiUrl}/employees`).pipe(
      tap((resData) => {
        console.log('Risposta dal backend (employees):', resData);
      }),
      map((employees) => employees.map(
        (employee) => ({
          id: employee.Id || employee.id, 
          name: employee.Name || employee.name,
          surname: employee.Surname || employee.surname,
          jobRole: this.jobRolesCaricati().find(r => r.name === employee.jobRole)?.name || 'N/A',
          jobRoleLevel: this.jobRoleLevelsCaricati().find(l => l.name === employee.jobRoleLevel)?.name || 'N/A',
          company: this.aziendeCaricate().find(c => c.name === employee.company)?.name || 'N/A',
          isActive: employee.isActive,
        })
      )),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  caricaEmployeeById(id: string) {
    return this.httpClient.get<any>(`${environment.apiUrl}/employees/${encodeURIComponent(id)}`).pipe(
      tap((resData) => console.log('Risposta dal backend (employee byId):', resData)),
      map((employee) => ({
        id: employee.Id || employee.id, 
        name: employee.Name || employee.name,
        surname: employee.Surname || employee.surname,
        jobRole: this.jobRolesCaricati().find(r => r.name === employee.jobRole)?.name || 'N/A',
        jobRoleLevel: this.jobRoleLevelsCaricati().find(l => l.name === employee.jobRoleLevel)?.name || 'N/A',
        company: this.aziendeCaricate().find(c => c.name === employee.company)?.name || 'N/A',
        isActive: employee.isActive,
      })),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  getDropdownOptions() {
    return this.httpClient.get<any>(`${environment.apiUrl}/dropdown-options`).pipe(
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  //TODO: aggiungere metodo per eliminazione cliente (DELETE) e chiedere se è necessario un metodo per eliminazione progetto (DELETE)

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
    // NON usare il fallback ?? (progetto as any).pm perché se è una stringa rompe il backend
    return {
      activity: progetto.activity,
      description: progetto.description,
      projectStatusId: progetto.projectStatusId,
      customerId: progetto.customerId,
      head: progetto.head,
      companyId: progetto.companyId,
      pmId: progetto.pmId, // Deve essere un GUID o null, mai una stringa nome
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
    const dateOnly = value.split('T')[0];
    const [y, m, d] = dateOnly.split('-').map((v) => Number(v));
    if (!y || !m || !d) return value;
    return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return NaN;
    const raw = String(value).trim().replace(',', '.');
    const num = Number(raw);
    return Number.isFinite(num) ? num : NaN;
  }
}
