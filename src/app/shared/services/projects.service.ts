import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, concatMap, forkJoin, map, switchMap, tap, throwError, of, Observable } from 'rxjs';
import { Project, ProjectEmployee, ProjectRole, RecapData } from '../models/project.model';
import { Employee } from '../models/employee.model';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { toBackendDate, toNumber } from '../utils/shared-utils';
import { LookupsService } from './lookups.service';
import { buildEntityError } from '../utils/http-error-message.utils';
import { ProjectFilters, ProjectFiltersWithYear } from '../utils/filters.utils';
import { findEquivalentProjectEmployee, findProjectItemById, getProjectEmployeeRequestId, getRemovedProjectItems, hasProjectItemChanged, isTemporaryProjectItem } from '../utils/project-form.utils';
import { buildProjectEmployeePayload, buildProjectJobRolePayload, ProjectUpdatePayload } from '../payloads/project.payloads';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private errorService = inject(ErrorService);
  private lookupsService = inject(LookupsService);
  private httpClient = inject(HttpClient);

  private projects = signal<Project[]>([]);
  private projectJobRoles = signal<any[]>([]);
  private projectEmployees = signal<any[]>([]);
  private recapData = signal<RecapData | null>(null);
  private projectRecapData = signal<RecapData | null>(null);
  private projectPagination = signal<any>(null);

  loadedProjects = this.projects.asReadonly();
  loadedProjectJobRoles = this.projectJobRoles.asReadonly();
  loadedProjectEmployees = this.projectEmployees.asReadonly();
  paginationData = this.projectPagination.asReadonly();

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
      year: project.year || null,
      totalDays: project.totalDays || 0,
      winProbability: project.winProbability ? project.winProbability : 0,
      isFavorite: project.isFavorite || false,
      isEliminated: project.isEliminated || false,
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
    const cleanWinProb = typeof project.winProbability === 'string'
      ? Number(String(project.winProbability).replace(',', '.'))
      : project.winProbability;
    return {
      name: project.name,
      description: project.description,
      projectStatusId: project.projectStatusId,
      customerId: project.customerId,
      head: project.head,
      companyId: project.companyId,
      pmId: project.pmId,
      isFavorite: project.isFavorite || false,
      isEliminated: project.isEliminated || false,
      startDate: toBackendDate(project.startDate),
      endDate: toBackendDate(project.endDate),
      totalDays: toNumber(project.totalDays),
      winProbability: cleanWinProb || 0,
    };
  }

  // --- PROJECTS CRUD ---
  loadAvailableProjects() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projects`).pipe(
      map(projects => projects.map(p => this.mapToProject(p))),
      tap(projects => this.projects.set(projects)),
      catchError(error => {
        console.error(error);
        return throwError(() => buildEntityError(error, 'progetto', 'caricamento'));
      })
    );
  }

  loadProjects(pageNumber: number = 1, pageSize: number = 10, filters?: ProjectFiltersWithYear) {
    let url = `${environment.apiUrl}/projects/active?PageNumber=${pageNumber}&PageSize=${pageSize}`;

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
      if (filters.year) {
        params = params.set('Year', encodeURIComponent(filters.year));
      }
      if (filters.searchTerm) {
        params = params.set('SearchTerm', encodeURIComponent(filters.searchTerm));
      }
    }

    return this.httpClient.get<any[]>(url, { params, observe: 'response' }).pipe(
      tap(response => {
        const paginationHeader = response.headers.get('X-Pagination');
        if (paginationHeader) {
          const data = JSON.parse(paginationHeader);
          this.projectPagination.set({
            currentPage: data.CurrentPage,
            totalPages: data.TotalPages,
            pageSize: data.PageSize,
            totalCount: data.TotalCount,
            hasPrevious: data.HasPrevious,
            hasNext: data.HasNext
          });
        }
      }),
      map(response => (response.body || []).map(p => this.mapToProject(p))),
      tap(projects => this.projects.set(projects)) 
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
      catchError(error => throwError(() => buildEntityError(error, 'progetto', 'caricamento')))
    );
  }

  loadProjectRecapData(projectId: string) {
    return this.httpClient.get<RecapData>(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/recap`).pipe(
      map((r: RecapData) => ({
        totalRevenues: r.totalRevenues || 0,
        budgetTotaleRisorsa: r.budgetTotaleRisorsa || 0,
        delta: r.delta || 0,
        budgetWin: r.budgetWin || 0,
        totalEmployedDays: r.totalEmployedDays || 0
      })),
      tap(recap => this.recapData.set(recap)),
      catchError(error => throwError(() => buildEntityError(error, 'risorsa', 'caricamento')))
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
        this.errorService.showError('Errore durante la creazione del progetto.');
        return throwError(() => buildEntityError(error, 'progetto', 'creazione'));
      })
    );
  }

  updateProject(project: Project) {
    return this.httpClient.put(`${environment.apiUrl}/projects/${project.id}`, this.toProjectPayload(project)).pipe(
      tap(() => {
        this.projects.update(prev => prev.map(p => p.id === project.id ? { ...p, ...project } : p));
      }),
      catchError(error => {
        this.errorService.showError('Errore durante l\'aggiornamento del progetto.');
        return throwError(() => buildEntityError(error, 'progetto', 'aggiornamento'));
      })
    );
  }

  toggleFavoriteState(projectId: string, isFavorite: boolean) {

    const patchPayload = [
    { op: 'replace', path: '/isFavorite', value: isFavorite } 
    ];

    const headers = new HttpHeaders({
      'Content-Type': 'application/json-patch+json'
    });

    return this.httpClient.patch(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/isFavorite`, patchPayload, { headers }).pipe(
      tap(() => {
        this.projects.update(prev => prev.map(p => p.id === projectId ? { ...p, isFavorite } : p));
      })
    );
  }

  toggleEliminatedState(projectId: string, isEliminated: boolean) {
    const patchPayload = [
      { op: 'replace', path: '/isEliminated', value: isEliminated }
    ];

    const headers = new HttpHeaders({
      'Content-Type': 'application/json-patch+json'
    });

    return this.httpClient.patch(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/isEliminated`, patchPayload, { headers }).pipe(
      tap(() => {
        this.projects.update(prev => prev.map(p => p.id === projectId ? {...p, isEliminated} : p));
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

  setCustomerFilter(value: string) {
    this.loadAvailableProjects().pipe(
      tap(projects => {
        const filtered = projects.filter(p => 
          p.customer.toLowerCase().includes(value.toLowerCase())
        );
        this.projects.set(filtered);
      })
    ).subscribe();
  }

  setStatusFilter(value: string) {
    this.loadAvailableProjects().pipe(
      tap(projects => {
        if (!value) {
          this.projects.set(projects);
          return;
        }       
        const selectedStatus = this.lookupsService.loadedProjectStatuses().find(s => s.id === value);
        const statusName = selectedStatus?.name || '';       
        const filtered = projects.filter(p => p.projectStatus === statusName);
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
      catchError(error => throwError(() => buildEntityError(error, 'ruolo', 'caricamento')))
    );
  }

  addProjectJobRole(projectId: string, data: any) {
    return this.httpClient.post(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/jobRoles`, data).pipe(
      tap((created: any) => {
        if (created?.id) {
          this.projectJobRoles.update(prev => [...prev, { ...created, project: this.projects().find(p => p.id === projectId)?.name || 'N/A' }]);
        }
      }),
      catchError(error => {
        this.errorService.showError('Errore durante l\'inserimento del ruolo di progetto.');
        return throwError(() => buildEntityError(error, 'ruolo', 'assegnazione'));
      })
    );
  }

  updateProjectJobRole(projectId: string, roleId: string, data: any) {
    return this.httpClient.put(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/jobRoles/${encodeURIComponent(roleId)}`, data).pipe(
      tap(() => {
        this.projectJobRoles.update(prev => prev.map(role => role.id === roleId ? { ...role, ...data } : role));
      }),
      catchError(error => {
        this.errorService.showError('Errore durante l\'aggiornamento del ruolo di progetto.');
        return throwError(() => buildEntityError(error, 'ruolo', 'aggiornamento'));
      })
    );
  }

  deleteProjectJobRole(projectId: string, roleId: string) {
    return this.httpClient.delete(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/jobRoles/${encodeURIComponent(roleId)}`).pipe(
      tap(() => this.projectJobRoles.update(prev => prev.filter(r => r.id !== roleId))),
      catchError(error => {
        this.errorService.showError('Errore durante l\'eliminazione del ruolo di progetto.');
        return throwError(() => buildEntityError(error, 'ruolo', 'rimozione'));
      })
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
        monthlyManagements: emp.monthlyManagements || [],
      }))),
      tap(employees => this.projectEmployees.set(employees)),
      catchError(error => throwError(() => buildEntityError(error, 'risorsa', 'caricamento')))
    );
  }

  loadProjectEmployeeRecapData(
    projectId: string, 
    projectEmployeeId: string
  ): Observable<RecapData> {
    return this.httpClient.get<RecapData>(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/employees/${encodeURIComponent(projectEmployeeId)}/recap`).pipe(
      map((r: RecapData) => ({
        totalRevenues: r.totalRevenues || 0,
        budgetTotaleRisorsa: r.budgetTotaleRisorsa || 0,
        delta: r.delta || 0,
        budgetWin: r.budgetWin || 0,
        totalEmployedDays: r.totalEmployedDays || 0
      })),
      tap(recap => this.recapData.set(recap)),
      catchError(error => throwError(() => buildEntityError(error, 'risorsa', 'caricamento')))
    );
  }

  addProjectEmployee(
    projectId: string, 
    data: any
  ) {
    return this.httpClient.post(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/employees`, data).pipe(
      tap((created: any) => {
        if (created?.id) {
            this.projectEmployees.update(prev => [...prev, { ...created, employee: `${created.name} ${created.surname}` }]);
        }
      }),
      catchError(error => {
        this.errorService.showError('Errore durante l\'aggiunta della risorsa al progetto.');
        return throwError(() => buildEntityError(error, 'risorsa', 'assegnazione'));
      })
    );
  }

  updateProjectEmployee(
    projectId: string, 
    projectEmployeeId: string, 
    data: any
  ) {
    return this.httpClient.put(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/employees/${encodeURIComponent(projectEmployeeId)}`, data).pipe(
      tap(() => {
        this.projectEmployees.update(prev => prev.map(employee =>
          employee.id === projectEmployeeId
            ? { ...employee, ...data }
            : employee
        ));
      }),
      catchError(error => {
        this.errorService.showError('Errore durante l\'aggiornamento della risorsa di progetto.');
        return throwError(() => buildEntityError(error, 'risorsa', 'aggiornamento'));
      })
    );
  }

  replaceProjectEmployee(
    projectId: string, 
    projectEmployeeId: string, 
    data: any
  ) {
    return this.deleteProjectEmployee(projectId, projectEmployeeId).pipe(
      concatMap(() => this.addProjectEmployee(projectId, data))
    );
  }

  updateProjectEmployeesForEmployeeRole(
    employee: Employee,
    jobRoleId: string | null | undefined,
    jobRoleLevelId: string | null,
  ) {
    return this.loadAvailableProjects().pipe(
      switchMap((projects) => {
        const updates = projects.flatMap((project) => {
          const matchingProjectEmployees = (project.projectEmployees || []).filter((projectEmployee: any) =>
            this.isProjectEmployeeForEmployee(projectEmployee, employee)
          );

          return matchingProjectEmployees.map((projectEmployee: any) =>
            this.updateProjectEmployee(project.id, projectEmployee.id, {
              employeeId: employee.id,
              jobRoleId: jobRoleId || null,
              jobRoleLevelId,
              dailyCost: projectEmployee.dailyCost || 0,
              daysSpent: projectEmployee.daysSpent || 0,
              winProbability: projectEmployee.winProbability || 0,
              monthlyManagements: projectEmployee.monthlyManagements || [],
            })
          );
        });

        return updates.length ? forkJoin(updates) : of([]);
      }),
    );
  }

  deleteProjectEmployee(
    projectId: string, 
    projectEmployeeId: string
  ) {
    return this.httpClient.delete(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/employees/${encodeURIComponent(projectEmployeeId)}`).pipe(
      tap(() => this.projectEmployees.update(prev => prev.filter(e => e.id !== projectEmployeeId))),
      catchError(error => {
        this.errorService.showError('Errore durante la rimozione della risorsa dal progetto.');
        return throwError(() => buildEntityError(error, 'risorsa', 'rimozione'));
      })
    );
  }

  private isProjectEmployeeForEmployee(
    projectEmployee: any, 
    employee: Employee
  ): boolean {
    if (projectEmployee.employeeId && String(projectEmployee.employeeId) === String(employee.id)) {
      return true;
    }

    const projectEmployeeName = this.normalizeEmployeeName(projectEmployee.employee || '');
    const nameSurname = this.normalizeEmployeeName(`${employee.name} ${employee.surname}`);
    const surnameName = this.normalizeEmployeeName(`${employee.surname} ${employee.name}`);

    return projectEmployeeName === nameSurname || projectEmployeeName === surnameName;
  }

  private normalizeEmployeeName(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '');
  }

  addProjectWithDetails(
    projectPayload: Project,
    currentRoles: ProjectRole[],
    currentEmployees: ProjectEmployee[],
    pendingEmployeeCalls: Observable<any>[]
  ): Observable<any>
  {
    return this.addProject(projectPayload).pipe(
      switchMap((createdProject: any) => {
        const newProjectId = createdProject.id;
        const detailRequests: Observable<any>[] = [];

        currentRoles.forEach((role: any) => {
          detailRequests.push(this.addProjectJobRole(newProjectId, [buildProjectJobRolePayload(role)]));
        });

        currentEmployees.forEach((employee: any) => {
          detailRequests.push(this.addProjectEmployee(newProjectId, [buildProjectEmployeePayload(employee)]));
        });

        detailRequests.push(...pendingEmployeeCalls);

        if(detailRequests.length === 0){
          return of(createdProject);
        }

        return forkJoin(detailRequests).pipe(
          map(() => createdProject)
        );
      })
    );
  }

  updateProjectWithDetails(
    projectId: string,
    projectPayload: any,
    initialData: any,
    currentRoles: ProjectRole[],
    currentEmployees: ProjectEmployee[],
    pendingEmployeeCalls: Observable<any>[]
  ): Observable<any> {
    const deleteCalls: Observable<any>[] = [];
    const saveCalls: Observable<any>[] = [];

    const originalRoles = initialData?.projectJobRoles || [];
    const rolesToRemove = getRemovedProjectItems(originalRoles, currentRoles);
    rolesToRemove.forEach((role) => deleteCalls.push(this.deleteProjectJobRole(projectId, role.id)));

    const originalEmployees = initialData?.projectEmployees || [];
    const employeesToRemove = getRemovedProjectItems(originalEmployees, currentEmployees);
    employeesToRemove.forEach((employee) => 
      deleteCalls.push(this.deleteProjectEmployee(projectId, getProjectEmployeeRequestId(employee)))
    );

    saveCalls.push(this.updateProject(projectPayload));
    saveCalls.push(...pendingEmployeeCalls);

    currentRoles.forEach((role: any) => {
      const rolePayload = buildProjectJobRolePayload(role);
      const originalRole = findProjectItemById(originalRoles, role.id);
      
      const isTemporary = isTemporaryProjectItem(role.id, originalRoles);

      if (isTemporary) {
        saveCalls.push(this.addProjectJobRole(projectId, [rolePayload]));
      } else if (hasProjectItemChanged(role, originalRole)) {
        saveCalls.push(this.updateProjectJobRole(projectId, role.id, rolePayload));
      }
    });

    currentEmployees.forEach((employee: any) => {
      const employeePayload = buildProjectEmployeePayload(employee);
      const originalEmployee = findProjectItemById(originalEmployees, employee.id);
      const isTemporary = isTemporaryProjectItem(employee.id, originalEmployees);

      if (isTemporary) {
        const equivalentOriginalEmployee = findEquivalentProjectEmployee(originalEmployees, employee);
        if (!equivalentOriginalEmployee) {
          saveCalls.push(this.addProjectEmployee(projectId, [employeePayload]));
        }
      } else if (hasProjectItemChanged(employee, originalEmployee)) {
        saveCalls.push(this.updateProjectEmployee(projectId, getProjectEmployeeRequestId(employee), employeePayload));
      }
    });

    if (deleteCalls.length > 0) {
      return forkJoin(deleteCalls).pipe(
        switchMap(() => forkJoin(saveCalls))
      );
    } else {
      return forkJoin(saveCalls);
    }
  }
}
