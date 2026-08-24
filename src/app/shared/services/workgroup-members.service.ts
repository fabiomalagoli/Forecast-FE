import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, throwError, Observable } from 'rxjs';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';
import { User } from '../models/user.model';

export interface GroupMemberForUpdateDto { role: string; }

@Injectable({ providedIn: 'root' })
export class WorkGroupMembersService {
  private errorService = inject(ErrorService);
  private httpClient = inject(HttpClient);

  getWorkGroupMembers(
    workGroupId: string, 
    pageNumber = 1, 
    pageSize = 5, 
    filters?: { searchTerm?: string | null; role?: string | null }
  ): Observable<{ members: User[]; pagination: any }> {
    let params = new HttpParams()
      .set('PageNumber', pageNumber)
      .set('PageSize', pageSize);

    if (filters?.searchTerm) params = params.set('SearchTerm', filters.searchTerm);
    if (filters?.role) params = params.set('Role', filters.role);

    return this.httpClient.get<any[]>(`${environment.apiUrl}/groups/${workGroupId}/members`, { params, observe: 'response' }).pipe(
      map(response => {
        const paginationHeader = response.headers.get('X-Pagination');
        const pagination = paginationHeader ? JSON.parse(paginationHeader) : null;
        const members: User[] = (response.body || []).map(m => ({
          id: m.userId || m.UserId || m.id,
          userName: m.userName || m.UserName || m.email || '',
          firstName: m.firstName || m.FirstName || '',
          lastName: m.lastName || m.LastName || '',
          role: m.role || m.Role || ''
        }));
        return { members, pagination };
      }),
      catchError(error => throwError(() => buildEntityError(error, 'membri', 'caricamento')))
    );
  }

  addMemberToWorkGroup(workGroupId: string, userId: string, role: string): Observable<void> {
    return this.httpClient.post<void>(`${environment.apiUrl}/groups/${workGroupId}/members`, { userId, role });
  }

  updateMemberRole(workGroupId: string, userId: string, role: string): Observable<void> {
    return this.httpClient.put<void>(`${environment.apiUrl}/groups/${workGroupId}/members/${userId}`, { role }).pipe(
      catchError(error => throwError(() => buildEntityError(error, 'membri', 'aggiornamento')))
    );
  }

  removeMemberFromWorkGroup(workGroupId: string, userId: string): Observable<void> {
    return this.httpClient.delete<void>(`${environment.apiUrl}/groups/${workGroupId}/members/${userId}`).pipe(
      catchError(error => throwError(() => buildEntityError(error, 'membri', 'eliminazione')))
    );
  }
}