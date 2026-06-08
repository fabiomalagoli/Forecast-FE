import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, tap, throwError, of } from 'rxjs';
import { CreateRoleRequest, Role } from '../models/role.model';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private errorService = inject(ErrorService);
  private httpClient = inject(HttpClient);

  private jobRoles = signal<Role[]>([]);
  private allJobRoles = signal<Role[]>([]);
  private jobRoleLevels = signal<Role[]>([]);
  private rolesPagination = signal<any>(null);
  private lastSelectedRole = signal<Role | null>(null);

  loadedJobRoles = this.jobRoles.asReadonly();
  loadedAllJobRoles = this.allJobRoles.asReadonly();
  loadedJobRoleLevels = this.jobRoleLevels.asReadonly();
  paginationData = this.rolesPagination.asReadonly();
  lastRoleSelected = this.lastSelectedRole.asReadonly();

  setLastSelectedRole(role: Role | null) {
    this.lastSelectedRole.set(role);
  }

  // --- JOB ROLES ---
  loadJobRoles(pageNumber: number = 1, pageSize: number = 10, filters?: { searchTerm?: string | null }) {
    let url = `${environment.apiUrl}/jobroles?PageNumber=${pageNumber}&PageSize=${pageSize}`;

    let params = new HttpParams();
    if (filters?.searchTerm) {
      params = params.set('SearchTerm', filters.searchTerm);
    }
    return this.httpClient.get<any[]>(url, { params, observe: 'response' }).pipe(
      tap(response => {
        const paginationHeader = response.headers.get('X-Pagination');
        if (paginationHeader) {
          const data = JSON.parse(paginationHeader);
          this.rolesPagination.set({
            currentPage: data.CurrentPage,
            totalPages: data.TotalPages,
            pageSize: data.PageSize,
            totalCount: data.TotalCount,
            hasPrevious: data.HasPrevious,
            hasNext: data.HasNext
          });
        }
        this.jobRoles.set(response.body || []);
      }),
      map(response => response.body || []),
    );
  }

  loadAllJobRoles() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/jobroles?PageNumber=1&PageSize=1000`, { observe: 'response' }).pipe(
      tap(response => this.allJobRoles.set(response.body || [])),
      map(response => response.body || []),
    );
  }

  addJobRole(role: CreateRoleRequest) {
    return this.httpClient.post(`${environment.apiUrl}/jobroles`, { name: role.name }, {
      headers: { 'Content-Type': 'application/json-patch+json' },
    }).pipe(
      tap((created: any) => {
        const newId = created?.id || created?.Id;
        const newName = created?.name || created?.Name;
        const newIsDefault = created?.isDefault || created?.IsDefault || false;

        if (newId) {
          const newRole = { id: newId, name: newName, isDefault: newIsDefault };
          this.jobRoles.update(prev => [...prev, newRole]);
          this.allJobRoles.update(prev => [...prev, newRole]);
        }
      }),
      catchError(error => {
        this.errorService.showError('Errore durante l\'aggiunta del ruolo.');
        return throwError(() => buildEntityError(error, 'ruolo', 'creazione'));
      })
    );
  }

  updateJobRole(role: Role) {
    return this.httpClient.put(`${environment.apiUrl}/jobRoles/${role.id}`, { name: role.name }).pipe(
      tap(() => {
        this.jobRoles.update(prev => prev.map(r => r.id === role.id ? { ...r, ...role } : r));
        this.allJobRoles.update(prev => prev.map(r => r.id === role.id ? { ...r, ...role } : r));
      }),
      catchError(error => {
        this.errorService.showError('Errore durante l\'aggiornamento del ruolo.');
        return throwError(() => buildEntityError(error, 'ruolo', 'aggiornamento'));
      })
    );
  }

  // --- JOB ROLE LEVELS ---
  loadJobRoleLevels() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/jobrolelevels`).pipe(
      map(levels => levels.map(level => ({ id: level.id, name: level.name, isDefault: level.isDefault }))),
      tap(levels => this.jobRoleLevels.set(levels)),
      catchError(error => throwError(() => buildEntityError(error, 'ruolo', 'caricamento')))
    );
  }
}
