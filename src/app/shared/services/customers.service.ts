import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, tap, throwError, of, Observable } from 'rxjs';
import { Customer } from '../models/customer.model';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';
import { Project } from '../models/project.model';
import { ProjectFilters } from '../utils/filters.utils';
@Injectable({ providedIn: 'root' })
export class CustomersService {
  private errorService = inject(ErrorService);
  private httpClient = inject(HttpClient);
  private customersPagination = signal<any>(null);
  private customerProjectPagination = signal<any>(null);
  private customers = signal<Customer[]>([]);
  private customerProjects = signal<Project[]>([]);
  loadedCustomerProjects = this.customerProjects.asReadonly();
  loadedCustomers = this.customers.asReadonly();
  customerPaginationData = this.customersPagination.asReadonly();
  customerProjectsPaginationData = this.customerProjectPagination.asReadonly();

  private mapToCustomer(customer: any): Customer {
    return {
      id: customer.id,
      vatNumber: customer.vatNumber,
      name: customer.name,
      fullAddress: customer.fullAddress,
      isEliminated: customer.IsEliminated ?? customer.isEliminated ?? false,
      projects: customer.projects ? customer.projects.length : 0,
      activeProjects: customer.projects || [],
    };
  }

  private mapToProject(dto: any): Project {
  return {
    id: dto.id ?? dto.Id,
    name: dto.name ?? dto.Name,
    company: dto.company ?? dto.Company ?? 'N/A',
    companyId: dto.companyId ?? dto.CompanyId ?? null,
    projectStatus: dto.projectStatus ?? dto.ProjectStatus ?? 'Initiation',
    projectStatusId: dto.projectStatusId ?? dto.ProjectStatusId ?? null,
    totalBudget: dto.totalBudget ?? dto.TotalBudget ?? 0,
    description: dto.description ?? dto.Description,
    year: dto.year ?? dto.Year ?? null
  } as Project;
}

  private toCustomerPayload(customer: Customer) {
    return {
      vatNumber: customer.vatNumber,
      name: customer.name,     
      address: customer.address,
      streetNumber: customer.streetNumber,
      postalCode: customer.postalCode,
      city: customer.city,
      province: customer.province,
      country: customer.country,
    };
  }

  loadAvailableCustomers() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/customers`).pipe(
      map(customers => customers.map(c => this.mapToCustomer(c))),
      catchError(error => throwError(() => buildEntityError(error, 'cliente', 'caricamento')))
    );
  }

  loadCustomers(pageNumber: number = 1, pageSize: number = 10, filters?: { searchTerm?: string | null }) {
    let url = `${environment.apiUrl}/customers/active?PageNumber=${pageNumber}&PageSize=${pageSize}`;

    let params = new HttpParams();

    if (filters?.searchTerm) {
      params = params.set('SearchTerm', filters.searchTerm);
    }
    return this.httpClient.get<any[]>(url, { params, observe: 'response' }).pipe(
      tap(response => {
        const paginationHeader = response.headers.get('X-Pagination');
        if (paginationHeader) {
          const data = JSON.parse(paginationHeader);
          this.customersPagination.set({
            currentPage: data.CurrentPage,
            totalPages: data.TotalPages,
            pageSize: data.PageSize,
            totalCount: data.TotalCount,
            hasPrevious: data.HasPrevious,
            hasNext: data.HasNext
          });
        }
        const customers = (response.body || []).map(c => this.mapToCustomer(c));
        this.customers.set(customers);
      }),
      map(response => (response.body || []).map(c => this.mapToCustomer(c))),
    );
  }

  loadCustomerById(id: string): Observable<Customer> {
    const cached = this.customers().find(c => c.id === id);
    if (cached) return of(cached);

    return this.httpClient.get<any>(`${environment.apiUrl}/customers/${encodeURIComponent(id)}`).pipe(
      map(c => this.mapToCustomer(c)),
      tap(c => {
        const prev = this.customers();
        const next = prev.some(x => x.id === c.id) ? prev.map(x => (x.id === c.id ? c : x)) : [...prev, c];
        this.customers.set(next);
      }),
      catchError(error => throwError(() => buildEntityError(error, 'cliente', 'caricamento')))
    );
  }

  addCustomer(customer: Customer) {
    const payload = this.toCustomerPayload(customer);
    return this.httpClient.post<Customer>(`${environment.apiUrl}/customers`, payload).pipe(
      tap(created => {
        if (created?.id) {
          this.customers.update(prev => [...prev, created]);
        }
      }),
      catchError(error => {
        this.errorService.showError('Errore durante l\'aggiunta del cliente.');
        return throwError(() => buildEntityError(error, 'cliente', 'creazione'));
      })
    );
  }

  updateCustomer(customer: Customer) {
    const payload = this.toCustomerPayload(customer);
    return this.httpClient.put(`${environment.apiUrl}/customers/${encodeURIComponent(customer.id)}`, payload).pipe(
      tap(() => {
        this.customers.update(prev => prev.map(c => c.id === customer.id ? { ...c, ...customer } : c));
      }),
      catchError(error => {
        this.errorService.showError('Errore durante l\'aggiornamento del cliente.');
        return throwError(() => buildEntityError(error, 'cliente', 'aggiornamento'));
      })
    );
  }

  toggleEliminatedState(customerId: string, isEliminated: boolean) {
    const patchPayload = [
      { op: 'replace', path: '/isEliminated', value: isEliminated }
    ];

    const headers = new HttpHeaders({
      'Content-Type': 'application/json-patch+json'
    });

    return this.httpClient.patch(`${environment.apiUrl}/customers/${encodeURIComponent(customerId)}/isEliminated`, patchPayload, { headers }).pipe(
      tap(() => {
        if (isEliminated) {
        this.customers.update(prev => prev.filter(c => c.id !== customerId));
        } else {
          this.customers.update(prev => prev.map(c => c.id === customerId ? {...c, isEliminated} : c));
        }
      })
    );
  }

  loadActiveProjectsForCustomer(customerId: string, pageNumber: number = 1, pageSize: number = 3, filters?: ProjectFilters): Observable<Project[]> {
    let url = `${environment.apiUrl}/customers/${encodeURIComponent(customerId)}/projects?PageNumber=${pageNumber}&PageSize=${pageSize}`;

    let params = new HttpParams()
    .set('PageNumber', pageNumber.toString())
    .set('PageSize', pageSize.toString());

    if (filters) {
      if (filters.companyId) {
        params = params.set('CompanyId', encodeURIComponent(filters.companyId));
      }
      if (filters.customerId) {
        params = params.set('CustomerId', encodeURIComponent(filters.customerId));
      }
      if (filters.projectStatusId) {
        params = params.set('ProjectStatusId', encodeURIComponent(filters.projectStatusId));
      }
      if (filters.searchTerm) {
        params = params.set('SearchTerm', encodeURIComponent(filters.searchTerm));
      }
    }

    return this.httpClient.get<Project[]>(url, { params, observe: 'response'}).pipe(
      map(response => {
        const paginationHeader = response.headers.get('X-Pagination');
        if (paginationHeader) {
          this.customerProjectPagination.set(JSON.parse(paginationHeader));
        }
        const projects = (response.body || []).map(dto => this.mapToProject(dto));
        this.customerProjects.set(projects);
        return projects;
      }),
      catchError(error => throwError(() => buildEntityError(error, 'progetto', 'caricamento')))
    );
  }

  setCustomerNameFilter(value: string) {
    this.loadCustomers(1, 10, { searchTerm: value }).pipe(
      tap(customers => {
        this.customers.set(customers);
      })
    ).subscribe();
  }

}
