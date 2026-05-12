import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, throwError, of, Observable } from 'rxjs';
import { Project } from '../../projects/project/project.model';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { toBackendDate, toNumber, normalizeWinProbability } from '../utils/shared-utils';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private errorService = inject(ErrorService);
  private httpClient = inject(HttpClient);

  private projects = signal<Project[]>([]);
  private projectJobRoles = signal<any[]>([]);
  private projectEmployees = signal<any[]>([]);

  loadedProjects = this.projects.asReadonly();
  loadedProjectJobRoles = this.projectJobRoles.asReadonly();
  loadedProjectEmployees = this.projectEmployees.asReadonly();

  // --- MAPPING PAYLOADS ---
  private mapToProject(project: any): Project {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      head: project.head,
      company: project.company || 'N/A',
      pm: project.pm || 'N/A',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      totalDays: project.totalDays || 0,
      winProbability: project.winProbability ? project.winProbability * 100 : 0,
      projectEmployees: project.projectEmployees || [],
      projectJobRoles: project.projectJobRoles || [],
      projectStatus: project.projectStatus || 'Initiation',
      customer: project.customer || 'N/A',
      companyId: project.companyId || null,
      pmId: project.pmId || null,
      customerId: project.customerId || null,
      projectStatusId: project.projectStatusId || null,
      totalBudget: project.totalBudget || 0,
    };
  }

  private toProjectPayload(project: Project) {
    return {
      name: project.name,
      description: project.description,
      projectStatusId: project.projectStatusId,
      customerId: project.customerId,
      head: project.head,
      companyId: project.companyId,
      pmId: project.pmId,
      startDate: toBackendDate(project.startDate),
      endDate: toBackendDate(project.endDate),
      totalDays: toNumber(project.totalDays),
      winProbability: normalizeWinProbability(toNumber(project.winProbability)),
    };
  }

  // --- PROJECTS CRUD ---
  loadAvailableProjects() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projects`).pipe(
      map(projects => projects.map(p => this.mapToProject(p))),
      tap(projects => this.projects.set(projects)),
      catchError(error => {
        console.error(error);
        return throwError(() => new Error('Something went wrong. Please try again later.'));
      })
    );
  }

  loadProjectById(id: string): Observable<Project> {
    const cached = this.projects().find(p => p.id === id);
    if (cached) return of(cached);

    return this.httpClient.get<any>(`${environment.apiUrl}/projects/${encodeURIComponent(id)}`).pipe(
      map(p => this.mapToProject(p)),
      tap(p => {
        const prev = this.projects();
        const next = prev.some(x => x.id === p.id) ? prev.map(x => (x.id === p.id ? p : x)) : [...prev, p];
        this.projects.set(next);
      }),
      catchError(error => throwError(() => new Error('Something went wrong. Please try again later.')))
    );
  }

  addProject(project: Project) {
    const payload = this.toProjectPayload(project);
    return this.httpClient.post<Project>(`${environment.apiUrl}/projects`, payload).pipe(
      tap(created => {
        if (created?.id) {
          this.projects.update(prev => [...prev, created]);
        }
      }),
      catchError(error => {
        this.errorService.showError('Insertion failed.');
        return throwError(() => error);
      })
    );
  }

  updateProject(project: Project) {
    return this.httpClient.put(`${environment.apiUrl}/projects/${project.id}`, this.toProjectPayload(project)).pipe(
      tap(() => {
        this.projects.update(prev => prev.map(p => p.id === project.id ? { ...p, ...project } : p));
      }),
      catchError(error => {
        this.errorService.showError('Update failed.');
        return throwError(() => error);
      })
    );
  }

  // Filters...
  setCompanyFilter(value: string) {
    this.loadAvailableProjects().pipe(
      tap(projects => {
        const filtered = projects.filter(p => p.company.toLowerCase().includes(value.toLowerCase()));
        this.projects.set(filtered);
      })
    ).subscribe();
  }

  // --- PROJECT JOB ROLES ---
  loadProjectJobRoles(projectId: string) {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/jobRoles`).pipe(
      map(roles => roles.map(role => ({
        id: role.id,
        project: this.projects().find(p => p.id === projectId)?.name || 'N/A',
        jobRole: role.jobRole || 'N/A',
        jobRoleLevel: role.jobRoleLevel || 'N/A',
        dailyCost: role.dailycost || 0,
        daysSpent: role.daysSpent || 0,
        effort: role.effort || 0,
        winProbability: role.winProbability || 0,
      }))),
      tap(roles => this.projectJobRoles.set(roles)),
      catchError(error => throwError(() => new Error('Something went wrong.')))
    );
  }

  addProjectJobRole(projectId: string, data: any) {
    return this.httpClient.post(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/jobRoles`, data).pipe(
      tap((created: any) => {
        if (created?.id) {
          this.projectJobRoles.update(prev => [...prev, { ...created, project: this.projects().find(p => p.id === projectId)?.name || 'N/A' }]);
        }
      }),
      catchError(error => throwError(() => error))
    );
  }

  deleteProjectJobRole(projectId: string, roleId: string) {
    return this.httpClient.delete(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/jobRoles/${encodeURIComponent(roleId)}`).pipe(
      tap(() => this.projectJobRoles.update(prev => prev.filter(r => r.id !== roleId))),
      catchError(error => throwError(() => error))
    );
  }

  // --- PROJECT EMPLOYEES ---
  loadProjectEmployees(projectId: string) {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/employees`).pipe(
      map(employees => employees.map(emp => ({
        id: emp.id,
        project: this.projects().find(p => p.id === projectId)?.name || 'N/A',
        employee: `${emp.name} ${emp.surname}`,
        isActive: emp.isActive,
        jobRole: emp.jobRole || 'N/A',
        jobRoleLevel: emp.jobRoleLevel || 'N/A',
        dailyCost: emp.dailyCost || 0,
        daysSpent: emp.daysSpent || 0,
        effort: emp.effort || 0,
        winProbability: emp.winProbability || 0,
      }))),
      tap(employees => this.projectEmployees.set(employees)),
      catchError(error => throwError(() => new Error('Something went wrong.')))
    );
  }

  addProjectEmployee(projectId: string, data: any) {
    return this.httpClient.post(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/employees`, data).pipe(
      tap((created: any) => {
        if (created?.id) {
            this.projectEmployees.update(prev => [...prev, { ...created, employee: `${created.name} ${created.surname}` }]);
        }
      }),
      catchError(error => throwError(() => error))
    );
  }

  deleteProjectEmployee(projectId: string, employeeId: string) {
    return this.httpClient.delete(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/employees/${encodeURIComponent(employeeId)}`).pipe(
      tap(() => this.projectEmployees.update(prev => prev.filter(e => e.id !== employeeId))),
      catchError(error => throwError(() => error))
    );
  }
}