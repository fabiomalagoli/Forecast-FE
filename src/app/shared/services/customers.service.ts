import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, throwError, of, Observable } from 'rxjs';
import { Customer } from '../models/customer.model';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private errorService = inject(ErrorService);
  private httpClient = inject(HttpClient);
  private customersPagination = signal<any>(null);
  private customers = signal<Customer[]>([]);
  loadedCustomers = this.customers.asReadonly();
  paginationData = this.customersPagination.asReadonly();

  private mapToCustomer(customer: any): Customer {
    return {
      id: customer.id,
      vatNumber: customer.vatNumber,
      name: customer.name,
      fullAddress: customer.fullAddress,
      projects: customer.projects ? customer.projects.length : 0,
      activeProjects: customer.projects || [],
    };
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
      tap(customers => this.customers.set(customers)),
      catchError(error => throwError(() => buildEntityError(error, 'cliente', 'caricamento')))
    );
  }

  loadCustomers(pageNumber: number = 1, pageSize: number = 10) {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/customers?PageNumber=${pageNumber}&PageSize=${pageSize}`, { observe: 'response' }).pipe(
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
      catchError(error => throwError(() => buildEntityError(error, 'cliente', 'caricamento')))
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

  loadActiveProjectsForCustomer(customerId: string) {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/customers/${encodeURIComponent(customerId)}/projects`).pipe(
      catchError(error => throwError(() => buildEntityError(error, 'progetto', 'caricamento')))
    );
  }

  setCustomerNameFilter(value: string) {
    this.loadAvailableCustomers().pipe(
      tap(customers => {
        const filtered = customers.filter(c => c.name.toLowerCase().includes(value.toLowerCase()));
        this.customers.set(filtered);
      })
    ).subscribe();
  }
}
