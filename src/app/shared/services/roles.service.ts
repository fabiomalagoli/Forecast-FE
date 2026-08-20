import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, tap, throwError, of } from 'rxjs';
import { CreateJobRoleRequest, JobRole } from '../models/job-role.model';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';
import { Role } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private errorService = inject(ErrorService);
  private httpClient = inject(HttpClient);

  private allRoles = signal<Role[]>([]);
  private lastSelectedRole = signal<Role | null>(null);

  loadedAllRoles = this.allRoles.asReadonly();
  lastRoleSelected = this.lastSelectedRole.asReadonly();

  setLastSelectedRole(role: Role | null) {
    this.lastSelectedRole.set(role);
  }

  private mapToRole(role: any): Role {
    return {
      id: role.id,
      name: role.name ?? role.Name,
    }
  }

  loadAllRoles(projectId?: string, groupId?: string) {
    let params = new HttpParams();

    if (projectId) {
      params = params.set('projectId', projectId);
    }
    if (groupId) {
      params = params.set('groupId', groupId);
    }

    return this.httpClient.get<any[]>(`${environment.apiUrl}/roles`, { params, observe: 'response' }).pipe(
      tap(response => {
        const roles = (response.body || []).map(r => this.mapToRole(r));
        this.allRoles.set(roles);
      }),
      map(response => (response.body || []).map(r => this.mapToRole(r))),
    );
  }
}
