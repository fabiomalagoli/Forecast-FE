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

  private Employees = signal<{ id: string; name: string; surname: string; jobRole: string; jobRoleLevel: string; company: string; isActive: boolean }[]>([]);

  private Cards = signal<CardModel[]>([]);

  private ProjectJobRoles = signal<{ id: string; project: string; jobRole: string; jobRoleLevel: string; dailyCost: number; daysSpent: number; effort: number; winProbability: number }[]>([]);

  private ProjectEmployees = signal<{ id: string; project: string; isActive: boolean; employee: string; jobRole: string; jobRoleLevel: string; dailyCost: number; daysSpent: number; effort: number; winProbability: number }[]>([]);

  projectJobRolesCaricati = this.ProjectJobRoles.asReadonly();

  projectEmployeesCaricati = this.ProjectEmployees.asReadonly();

  progettiCaricati = this.Progetti.asReadonly();

  clientiCaricati = this.Clienti.asReadonly();

  aziendeCaricate = this.Aziende.asReadonly();

  jobRolesCaricati = this.JobRoles.asReadonly();

  statiProgettoCaricati = this.StatiProgetto.asReadonly();

  jobRoleLevelsCaricati = this.JobRoleLevels.asReadonly();

  employeesCaricati = this.Employees.asReadonly();

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

  private updateProgetto(progetto: Progetto) {
    return this.httpClient.put(`${environment.apiUrl}/projects/${progetto.id}`, this.toProjectPayload(progetto)).pipe(
      tap(() => {
        this.Progetti.update(prev =>
          prev.map(p => p.id === progetto.id
            ? {...p, ...progetto }
            : p
          )
        );
      }),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'aggiornamento.');
        return throwError(() => error);
      }),
    );
  }

  aggiornaProgetto(progetto: Progetto) {
    return this.updateProgetto(progetto);
  }

  setFiltroAzienda(value: string) {
    this.caricaProgettiDisponibili().pipe(
      tap({
        next: (progetti) => {
          const filtered = progetti.filter(p => p.company.toLowerCase().includes(value.toLowerCase()));
          this.Progetti.set(filtered);
        }
      })
    ).subscribe();
  }

  setFiltroCliente(value: string) {
    this.caricaProgettiDisponibili().pipe(
      tap({
        next: (progetti) => {
          const filtered = progetti.filter(p => p.customer.toLowerCase().includes(value.toLowerCase()));
          this.Progetti.set(filtered);
        }
      })
    ).subscribe();
  }

  setFiltroStato(value: string) {
    this.caricaProgettiDisponibili().pipe(
      tap({
        next: (progetti) => {
          if (!value) {
            this.Progetti.set(progetti);
            return;
          }
          const statoSelezionato = this.StatiProgetto().find(s => s.id === value);
          const statoName = statoSelezionato?.name || '';
          const filtered = progetti.filter(p => p.projectStatus === statoName);
          this.Progetti.set(filtered);
        }
      })
    ).subscribe();
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

    const payload = this.toCustomerPayload(cliente) as any;
    delete payload.id;

    return this.httpClient
      .post<Cliente>(`${environment.apiUrl}/customers`, payload)
      .pipe(
        tap((created) => {
          if(created?.id) {
            this.Clienti.update(prev =>
              prev.map(c => (c.id === cliente.id ? created : c))
            );
          }
        }),
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
        console.log('Risposta dal backend (progetti):', resData); // Log per verificare la risposta
      }),
      map((projects) =>
        projects.map((project) => ({
          id: project.id,
          name: project.name,
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
        name: project.name,
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
        console.log('Risposta dal backend (clienti):', resData); // Log per verificare la risposta
      }),
      map((customers) =>
        customers.map((customer) => ({
          id: customer.id,
          vatNumber: customer.vatNumber,
          name: customer.name,
          fullAddress: customer.fullAddress,
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
        projects: customer.projects ? customer.projects.length : 0,
        activeProjects: customer.projects || [],
      })),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  private updateCliente(cliente: Cliente) {
    const payload = this.toCustomerPayload(cliente);
    const url = `${environment.apiUrl}/customers/${encodeURIComponent(cliente.id)}`;

    return this.httpClient.put(url, payload).pipe(
      tap(() => {
        this.Clienti.update(prev =>
          prev.map(c => c.id === cliente.id
            ? { ...c, ...cliente }
            : c
          )
        );
      }),
      catchError((error) => {
        this.errorService.showError("Errore durante l'aggiornamento.");
        return throwError(() => error);
      })
    );
  }



  //GET PER PROGETTI PER CLIENTE (visualizza progetti attivi cliente)

  private fetchProgettiAttiviCliente(clienteId: string) {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/customers/${encodeURIComponent(clienteId)}/projects`).pipe(
      tap((resData) => {
        console.log('Risposta dal backend (progetti attivi cliente):', resData);
      }),
      map((projects) =>
        projects.map((project) => ({
          id: project.id,
          name: project.name,
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
        }))
      ),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }


  caricaProgettiAttiviCliente(clienteId: string) {
    return this.fetchProgettiAttiviCliente(clienteId).pipe(
      tap({
        next: (progetti) => {
          const clienti = this.Clienti();
        }
      })
    );

  }

  aggiornaCliente(cliente: Cliente) {
    return this.updateCliente(cliente);
  }

  setFiltroNome(value: string) {
    this.caricaClientiDisponibili().pipe(
      tap({
        next: (clienti) => {
          const filtered = clienti.filter(c => c.name.toLowerCase().includes(value.toLowerCase()));
          this.Clienti.set(filtered);
        }
      })
    ).subscribe();
  }


  //Metodo GET per Aziende, PM e Clienti per dropdown nei form di inserimento/modifica progetto

  private fetchAziende() {
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

  private fetchAziendaById(id: string) {
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

  caricaAziendeDisponibili() {
    return this.fetchAziende().pipe(
      tap({
        next: (aziende) => this.Aziende.set(aziende),
      }),
    );
  }

  caricaAziendaById(id: string) {
    const cached = this.Aziende().find(a => a.id === id);
    if (cached) {
      return of(cached);
    }

    return this.fetchAziendaById(id).pipe(
      tap({
        next: (a) => {
          const prev = this.Aziende();
          const next = prev.some(x => x.id === a.id)
            ? prev.map(x => (x.id === a.id ? a : x))
            : [...prev, a];
          this.Aziende.set(next);
        },
      }),
    );
  }

  private fetchProjectStatus() {
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

  private fetchProjectStatusById(id: string) {
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

  caricaStatiProgettoDisponibili() {
    return this.fetchProjectStatus().pipe(
      tap({
        next: (stati) => this.StatiProgetto.set(stati),
      }),
    );
  }

  caricaStatoProgettoById(id: string) {
    const cached = this.StatiProgetto().find(s => s.id === id);
    if (cached) {
      return of(cached);
    }

    return this.fetchProjectStatusById(id).pipe(
      tap({
        next: (s) => {
          const prev = this.StatiProgetto();
          const next = prev.some(x => x.id === s.id)
            ? prev.map(x => (x.id === s.id ? s : x))
            : [...prev, s];
          this.StatiProgetto.set(next);
        },
      }),
    );
  }

  private fetchJobRoles() {
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

  private fetchJobRoleById(id: string) {
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

  caricaJobRolesDisponibili() {
    return this.fetchJobRoles().pipe(
      tap({
        next: (roles) => this.JobRoles.set(roles),
      }),
    );
  }

  caricaJobRoleById(id: string) {
    const cached = this.JobRoles().find(r => r.id === id);
    if (cached) {
      return of(cached);
    }

    return this.fetchJobRoleById(id).pipe(
      tap({
        next: (r) => {
          const prev = this.JobRoles();
          const next = prev.some(x => x.id === r.id)
            ? prev.map(x => (x.id === r.id ? r : x))
            : [...prev, r];
          this.JobRoles.set(next);
        },
      }),
    );
  }

  private fetchJobRoleLevels() {
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

  private fetchJobRoleLevelById(id: string) {
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

  caricaJobRoleLevelsDisponibili() {
    return this.fetchJobRoleLevels().pipe(
      tap({
        next: (levels) => this.JobRoleLevels.set(levels),
      }),
    );
  }

  caricaJobRoleLevelById(id: string) {
    const cached = this.JobRoleLevels().find(l => l.id === id);
    if (cached) {
      return of(cached);
    }

    return this.fetchJobRoleLevelById(id).pipe(
      tap({
        next: (l) => {
          const prev = this.JobRoleLevels();
          const next = prev.some(x => x.id === l.id)
            ? prev.map(x => (x.id === l.id ? l : x))
            : [...prev, l];
          this.JobRoleLevels.set(next);
        },
      }),
    );
  }

  private updateEmployee(employee: any) {
    return this.httpClient.put(`${environment.apiUrl}/employees/${encodeURIComponent(employee.id)}`, employee).pipe(
      tap(() => {
        this.Employees.update(prev =>
          prev.map(e => e.id === employee.id
            ? {...e, ...employee }
            : e
          )
        );
      }),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'aggiornamento.');
        return throwError(() => error);
      }),
    );
  }

  private CreateEmployee(employee: any) {
    return this.httpClient.post(`${environment.apiUrl}/employees`, employee).pipe(
      tap((created: any) => {
        if (created?.id) {
          this.Employees.update(prev =>
            [...prev, {
              id: created.id,
              name: created.name,
              surname: created.surname,
              jobRole: this.jobRolesCaricati().find(r => r.name === created.jobRole)?.name || 'N/A',
              jobRoleLevel: this.jobRoleLevelsCaricati().find(l => l.name === created.jobRoleLevel)?.name || 'N/A',
              company: this.aziendeCaricate().find(c => c.name === created.company)?.name || 'N/A',
              isActive: created.isActive,
            }]
          );
        }
      }),
      catchError((error) => {
        this.errorService.showError('Errore durante la creazione del dipendente.');
        return throwError(() => error);
      }),
    );
  }

  private DeleteEmployee(employeeId: string) {
    return this.httpClient.delete(`${environment.apiUrl}/employees/${encodeURIComponent(employeeId)}`).pipe(
      tap(() => {
        this.Employees.update(prev => prev.filter(e => e.id !== employeeId));
      }),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'eliminazione del dipendente.');
        return throwError(() => error);
      }),
    );
  }

  private fetchEmployees() {

    this.caricaAziendeDisponibili().subscribe({
      next: (aziende) => this.Aziende.set(aziende),
      error: (err) => console.log('Errore caricamento aziende:', err),
    });
    this.caricaJobRolesDisponibili().subscribe({
      next: (roles) => this.JobRoles.set(roles),
      error: (err) => console.log('Errore caricamento job roles:', err),
    });
    this.caricaJobRoleLevelsDisponibili().subscribe({
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

  private fetchEmployeeById(id: string) {
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

  caricaEmployeesDisponibili() {
    return this.fetchEmployees().pipe(
      tap(emps => this.Employees.set(emps))
    );
  }

  caricaEmployeeById(id: string) {
    const cached = this.Employees().find(e => e.id === id);
    if (cached) {
      return of(cached);
    }

    return this.fetchEmployeeById(id).pipe(
      tap({
        next: (e) => {
          const prev = this.Employees();
          const next = prev.some(x => x.id === e.id)
            ? prev.map(x => (x.id === e.id ? e : x))
            : [...prev, e];
          this.Employees.set(next);
        },
      }),
    );
  }

  private fetchProjectJobRoles(projectId: string) {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/jobRoles`).pipe(
      tap((resData) => {
        console.log('Risposta dal backend (project job roles):', resData);
      }),
      map((roles) => roles.map(
        (role) => ({
          id: role.id,
          project: this.Progetti().find(p => p.id === projectId)?.name || 'N/A',
          jobRole: role.jobRole || 'N/A',
          jobRoleLevel: role.jobRoleLevel || 'N/A',
          dailyCost: role.dailycost || 0,
          daysSpent: role.daysSpent || 0,
          effort: role.effort || 0,
          winProbability: role.winProbability ? role.winProbability : 0,
        })
      )),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  caricaProjectJobRoles(projectId: string) {
    return this.fetchProjectJobRoles(projectId).pipe(
      tap({
        next: (roles) => this.ProjectJobRoles.set(roles),
      }),
    );
  }

  private updateProjectJobRole(projectId: string, Id: string, data: any) {
    return this.httpClient.put(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/jobRoles/${encodeURIComponent(Id)}`, data).pipe(
      tap(() => {
        this.ProjectJobRoles.update(prev =>
          prev.map(r => r.id === Id
            ? {...r, ...data } // Aggiorna solo i campi modificati, mantenendo quelli non presenti in data invariati
            : r // Mantiene inalterati i ruoli non interessati dall'update
          )
        );
      }),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'aggiornamento del ruolo di progetto.');
        return throwError(() => error);
      }),
    );
  }

  aggiornaProjectJobRole(projectId: string, roleId: string, data: any) {
    return this.updateProjectJobRole(projectId, roleId, data);
  }

  private CreateProjectJobRole(projectId: string, data: any) {
    return this.httpClient.post(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/jobRoles`, data).pipe(
      tap((created: any) => {
        if (created?.id) {
          this.ProjectJobRoles.update(prev =>
            [...prev, {
              id: created.id,
              project: this.Progetti().find(p => p.id === projectId)?.name || 'N/A',
              jobRole: created.jobRole || 'N/A',
              jobRoleLevel: created.jobRoleLevel || 'N/A',
              dailyCost: created.dailyCost || 0,
              daysSpent: created.daysSpent || 0,
              effort: created.effort || 0,
              winProbability: created.winProbability ? created.winProbability : 0,
            }]
          );
        }
      }),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'inserimento del ruolo di progetto.');
        return throwError(() => error);
      }),
    );
  }

  aggiungiProjectJobRole(projectId: string, data: any) {
    return this.CreateProjectJobRole(projectId, data);
  }

  getDropdownOptions() {
    return this.httpClient.get<any>(`${environment.apiUrl}/dropdown-options`).pipe(
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  private DeleteProjectJobRole(projectId: string, roleId: string) {
    return this.httpClient.delete(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/jobRoles/${encodeURIComponent(roleId)}`).pipe(
      tap(() => {
        this.ProjectJobRoles.update(prev =>
          prev.filter(r => r.id !== roleId)
        );
      }), // Aggiorna lo stato locale rimuovendo il ruolo eliminato
      catchError((error) => {
        this.errorService.showError('Errore durante l\'eliminazione del ruolo di progetto.');
        return throwError(() => error);
      }),
    );
  }

  EliminaProjectJobRole(projectId: string, roleId: string) {
    return this.DeleteProjectJobRole(projectId, roleId);
  }

  private fetchProjectEmployees(projectId: string) {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/employees`).pipe(
      tap((resData) => {
        console.log('Risposta dal backend (project employees):', resData);
      }),
      map((employees) => employees.map(
        (employee) => ({
          id: employee.id,
          project: this.Progetti().find(p => p.id === projectId)?.name || 'N/A',
          employee: `${employee.name} ${employee.surname}`,
          isActive: employee.isActive,
          jobRole: this.jobRolesCaricati().find(r => r.name === employee.jobRole)?.name || 'N/A',
          jobRoleLevel: this.jobRoleLevelsCaricati().find(l => l.name === employee.jobRoleLevel)?.name || 'N/A',
          dailyCost: employee.dailyCost || 0,
          daysSpent: employee.daysSpent || 0,
          effort: employee.effort || 0,
          winProbability: employee.winProbability ? employee.winProbability : 0,
        })
      )),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error('Qualcosa è andato storto. Riprova più tardi.'));
      }),
    );
  }

  caricaProjectEmployees(projectId: string) {
    return this.fetchProjectEmployees(projectId).pipe(
      tap({
        next: (employees) => this.ProjectEmployees.set(employees),
      }),
    );
  }

  private updateProjectEmployee(projectId: string, employeeId: string, data: any) {
    return this.httpClient.put(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/employees/${encodeURIComponent(employeeId)}`, data).pipe(
      tap(() => {
        this.ProjectEmployees.update(prev =>
          prev.map(e => e.id === employeeId
            ? {...e, ...data } // Aggiorna solo i campi modificati, mantenendo quelli non presenti in data invariati
            : e // Mantiene inalterati i dipendenti non interessati dall'update
          )
        );
      }
    ),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'aggiornamento del dipendente di progetto.');
        return throwError(() => error);
      }),
    );
  }

  aggiornaProjectEmployee(projectId: string, employeeId: string, data: any) {
    return this.updateProjectEmployee(projectId, employeeId, data);
  }

  private createProjectEmployee(projectId: string, data: any) {
    return this.httpClient.post(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/employees`, data).pipe(
      tap((created: any) => {
        if (created?.id) {
          this.ProjectEmployees.update(prev =>
            [...prev, {
              id: created.id,
              project: this.Progetti().find(p => p.id === projectId)?.name || 'N/A',
              employee: `${created.name} ${created.surname}`,
              isActive: created.isActive,
              jobRole: this.jobRolesCaricati().find(r => r.name === created.jobRole)?.name || 'N/A',
              jobRoleLevel: this.jobRoleLevelsCaricati().find(l => l.name === created.jobRoleLevel)?.name || 'N/A',
              dailyCost: created.dailyCost || 0,
              daysSpent: created.daysSpent || 0,
              effort: created.effort || 0,
              winProbability: created.winProbability ? created.winProbability : 0,
            }]
          );
        }
      }),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'aggiunta del dipendente al progetto.');
        return throwError(() => error);
      }),
    );
  }

  aggiungiProjectEmployee(projectId: string, data: any) {
    return this.createProjectEmployee(projectId, data);
  }

  private deleteProjectEmployee(projectId: string, employeeId: string) {
    return this.httpClient.delete(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/employees/${encodeURIComponent(employeeId)}`).pipe(
      tap(() => {
        this.ProjectEmployees.update(prev =>
          prev.filter(e => e.id !== employeeId)
        );
      }), // Aggiorna lo stato locale rimuovendo il dipendente eliminato
      catchError((error) => {
        this.errorService.showError('Errore durante la rimozione del dipendente dal progetto.');
        return throwError(() => error);
      }),
    );
  }

  EliminaProjectEmployee(projectId: string, employeeId: string) {
    return this.deleteProjectEmployee(projectId, employeeId);
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

  caricaCardsDisponibili() {
    return this.fetchCards(
      `${environment.apiUrl}/projects/summary`,
      'Qualcosa è andato storto. Riprova più tardi.',
    ).pipe(
      tap({
        next: (cards) => this.Cards.set(cards),
      }),
    );
  }

  toProjectPayload(progetto: Progetto) {
    // NON usare il fallback ?? (progetto as any).pm perché se è una stringa rompe il backend
    return {
      name: progetto.name,
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

  toCustomerPayload(cliente: Cliente) {
    // NON usare il fallback ?? (progetto as any).pm perché se è una stringa rompe il backend
    return {
      vatNumber: cliente.vatNumber,
      name: cliente.name,     
      address: cliente.address,
      streetNumber: cliente.streetNumber,
      postalCode: cliente.postalCode,
      city: cliente.city,
      province: cliente.province,
      country: cliente.country,
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
