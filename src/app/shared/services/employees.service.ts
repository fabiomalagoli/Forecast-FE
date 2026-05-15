import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, throwError, of } from 'rxjs';
import { Employee } from '../models/employee.model';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  private errorService = inject(ErrorService);
  private httpClient = inject(HttpClient);

  private employees = signal<Employee[]>([]);
  private allEmployees = signal<Employee[]>([]);
  private employeesPagination = signal<any>(null);

  loadedEmployees = this.employees.asReadonly();
  loadedAllEmployees = this.allEmployees.asReadonly();
  paginationData = this.employeesPagination.asReadonly();

  private normalizeEmployee(emp: any): Employee {
    return {
      id: emp.Id || emp.id,
      name: emp.Name || emp.name,
      surname: emp.Surname || emp.surname,
      jobRole: emp.JobRole || emp.jobRole || 'N/A',
      jobRoleLevel: emp.JobRoleLevel || emp.jobRoleLevel || 'N/A',
      company: emp.Company || emp.company || 'N/A',
      isActive: emp.IsActive !== undefined ? emp.IsActive : emp.isActive,
    };
  }

  loadEmployees(pageNumber: number = 1, pageSize: number = 10) {
    const url = `${environment.apiUrl}/employees?PageNumber=${pageNumber}&PageSize=${pageSize}`;
    
    return this.httpClient.get<any[]>(url, { observe: 'response' }).pipe(
      tap((response) => {
        const paginationHeader = response.headers.get('X-Pagination');
        if (paginationHeader) {
          const data = JSON.parse(paginationHeader);
          this.employeesPagination.set({
            currentPage: data.CurrentPage,
            totalPages: data.TotalPages,
            pageSize: data.PageSize,
            totalCount: data.TotalCount,
            hasPrevious: data.HasPrevious,
            hasNext: data.HasNext
          });
        }
        const emps = (response.body || []).map(e => this.normalizeEmployee(e));
        this.employees.set(emps);
      }),
      map(response => (response.body || []).map(e => this.normalizeEmployee(e))),
      catchError(error => throwError(() => new Error('Something went wrong.')))
    );
  }

  loadAllEmployees() {
    const url = `${environment.apiUrl}/employees?PageNumber=1&PageSize=1000`;
    return this.httpClient.get<any[]>(url, { observe: 'response' }).pipe(
      tap((response) => {
        const emps = (response.body || []).map(e => this.normalizeEmployee(e));
        this.allEmployees.set(emps);
      }),
      map(response => (response.body || []).map(e => this.normalizeEmployee(e))),
      catchError(error => throwError(() => new Error('Something went wrong.')))
    );
  }

  loadEmployeeById(id: string) {
    const cached = this.findCachedEmployeeById(id);
    if (cached) return of(cached);

    return this.httpClient.get<any>(`${environment.apiUrl}/employees/${encodeURIComponent(id)}`, {
      params: {
        employeeId: id,
      },
    }).pipe(
      map(e => this.normalizeEmployee(e)),
      tap(e => {
        this.upsertEmployee(e);
      }),
      catchError(error => throwError(() => new Error('Something went wrong.')))
    );
  }

  private findCachedEmployeeById(id: string): Employee | undefined {
    return this.employees().find(employee => employee.id === id)
      || this.allEmployees().find(employee => employee.id === id);
  }

  private upsertEmployee(employee: Employee) {
    this.employees.update(prev =>
      prev.some(item => item.id === employee.id)
        ? prev.map(item => (item.id === employee.id ? employee : item))
        : [...prev, employee]
    );

    this.allEmployees.update(prev =>
      prev.some(item => item.id === employee.id)
        ? prev.map(item => (item.id === employee.id ? employee : item))
        : [...prev, employee]
    );
  }

  addEmployee(payload: any) {
    return this.httpClient.post(`${environment.apiUrl}/employees`, payload).pipe(
      tap((created: any) => {
        if (created?.id) {
          this.employees.update(prev => [...prev, this.normalizeEmployee(created)]);
        }
      }),
      catchError(error => {
        this.errorService.showError('Employee creation failed.');
        return throwError(() => error);
      })
    );
  }

  updateEmployee(id: string, payload: any, uiFallback: Employee) {
    return this.httpClient.put(`${environment.apiUrl}/employees/${encodeURIComponent(id)}`, payload).pipe(
      tap(() => {
        this.employees.update(prev => prev.map(e => e.id === id ? { ...e, ...uiFallback } : e));
      }),
      catchError(error => {
        this.errorService.showError('Employee update failed.');
        return throwError(() => error);
      })
    );
  }

  deleteEmployee(employeeId: string) {
    return this.httpClient.delete(`${environment.apiUrl}/employees/${encodeURIComponent(employeeId)}`).pipe(
      tap(() => this.employees.update(prev => prev.filter(e => e.id !== employeeId))),
      catchError(error => {
        this.errorService.showError('Deletion failed.');
        return throwError(() => error);
      })
    );
  }
}
