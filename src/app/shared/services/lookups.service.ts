import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class LookupsService {
  private httpClient = inject(HttpClient);

  private companies = signal<{ id: string; name: string; isDefault: boolean }[]>([]);
  private projectStatuses = signal<{ id: string; name: string; isDefault: boolean }[]>([]);

  loadedCompanies = this.companies.asReadonly();
  loadedProjectStatuses = this.projectStatuses.asReadonly();

  loadAvailableCompanies() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/companies?PageNumber=1&PageSize=1000`, { observe: 'response' }).pipe(
      map(response => (response.body || []).map(c => ({
        id: c.id ?? c.Id,
        name: c.name ?? c.Name,
        isDefault: c.isDefault ?? c.IsDefault
      }))),
      tap(companies => this.companies.set(companies)),
      catchError(error => throwError(() => new Error('Something went wrong.')))
    );
  }

  loadProjectStatuses() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projectstatus`).pipe(
      map(statuses => statuses.map(s => ({ id: s.id, name: s.name, isDefault: s.isDefault }))),
      tap(statuses => this.projectStatuses.set(statuses)),
      catchError(error => throwError(() => new Error('Something went wrong.')))
    );
  }

  getDropdownOptions() {
    return this.httpClient.get<any>(`${environment.apiUrl}/dropdown-options`).pipe(
      catchError(error => throwError(() => new Error('Something went wrong.')))
    );
  }
}