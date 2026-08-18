import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, tap, throwError, of } from 'rxjs';
import { CreateJobRoleRequest, JobRole } from '../models/job-role.model';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';

@Injectable({ providedIn: 'root' })
export class JobRolesService {
  private errorService = inject(ErrorService);
  private httpClient = inject(HttpClient);

  private jobRoles = signal<JobRole[]>([]);
  private allJobRoles = signal<JobRole[]>([]);
  private jobRoleLevels = signal<JobRole[]>([]);
  private rolesPagination = signal<any>(null);
  private lastSelectedRole = signal<JobRole | null>(null);

  loadedJobRoles = this.jobRoles.asReadonly();
  loadedAllJobRoles = this.allJobRoles.asReadonly();
  loadedJobRoleLevels = this.jobRoleLevels.asReadonly();
  paginationData = this.rolesPagination.asReadonly();
  lastRoleSelected = this.lastSelectedRole.asReadonly();

  setLastSelectedRole(role: JobRole | null) {
    this.lastSelectedRole.set(role);
  }

  private mapToJobRole(role: any): JobRole {
    return {
      id: role.id,
      name: role.name ?? role.Name,
      isEliminated: role.isEliminated ?? role.IsEliminated,
    }
  }

  // --- JOB ROLES ---
  loadJobRoles(pageNumber: number = 1, pageSize: number = 10, filters?: { searchTerm?: string | null }) {
    let url = `${environment.apiUrl}/jobroles/active?PageNumber=${pageNumber}&PageSize=${pageSize}`;

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
        const roles = (response.body || []).map(r => this.mapToJobRole(r));
        this.jobRoles.set(roles);
      }),
      map(response => (response.body || []).map(r => this.mapToJobRole(r))),
    );
  }

  loadAllJobRoles() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/jobroles?PageNumber=1&PageSize=1000`, { observe: 'response' }).pipe(
      tap(response => {
        const roles = (response.body || []).map(r => this.mapToJobRole(r));
        this.allJobRoles.set(roles);
      }),
      map(response => (response.body || []).map(r => this.mapToJobRole(r))),
    );
  }

  addJobRole(role: CreateJobRoleRequest) {
    return this.httpClient.post(`${environment.apiUrl}/jobroles`, { name: role.name }, {
      headers: { 'Content-Type': 'application/json-patch+json' },
    }).pipe(
    tap((created: any) => {
        if (created?.id) {
          this.allJobRoles.update(prev => [...prev, this.mapToJobRole(created)]);
          this.jobRoles.update(prev => [...prev, this.mapToJobRole(created)]);
        }
      }),
      catchError(error => {
        this.errorService.showError('Errore durante l\'aggiunta del ruolo.');
        return throwError(() => buildEntityError(error, 'ruolo', 'creazione'));
      })
    );
  }

  updateJobRole(role: JobRole) {
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

  toggleEliminatedState(jobRoleId: string, isEliminated: boolean) {
    const patchPayload = [
      { op: 'replace', path: '/isEliminated', value: isEliminated }
    ];

    const headers = new HttpHeaders({
      'Content-Type': 'application/json-patch+json'
    });

    return this.httpClient.patch(`${environment.apiUrl}/jobRoles/${encodeURIComponent(jobRoleId)}/isEliminated`, patchPayload, { headers }).pipe(
      tap(() => {
        this.jobRoles.update(prev => prev.map(j => j.id === jobRoleId ? {...j, isEliminated} : j));
      })
    );
  }

  // --- JOB ROLE LEVELS ---
  loadJobRoleLevels() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/jobrolelevels`).pipe(
      map(levels => levels.map(level => ({ id: level.id, name: level.name, isDefault: level.isDefault, isEliminated: level.isEliminated }))),
      tap(levels => this.jobRoleLevels.set(levels)),
      catchError(error => throwError(() => buildEntityError(error, 'ruolo', 'caricamento')))
    );
  }
}
