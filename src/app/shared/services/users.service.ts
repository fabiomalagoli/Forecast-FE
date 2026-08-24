import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, tap, throwError, Observable } from 'rxjs';
import { User } from '../models/user.model';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private errorService = inject(ErrorService);
  private httpClient = inject(HttpClient);

  private users = signal<User[]>([]);
  private usersPagination = signal<any>(null);

  loadedUsers = this.users.asReadonly();
  userPaginationData = this.usersPagination.asReadonly();

  private mapToUser(user: any): User {
    return {
      id: user.id || user.Id || user.userId || user.UserId || user.user_id || user.sub || '',
      firstName: user.firstName || user.FirstName || '',
      lastName: user.lastName || user.LastName || '',
      userName: user.userName || user.UserName || user.username || user.email || user.Email || '',
      role: user.role || user.Role || '',
      photoUrl: user.photoUrl || user.PhotoUrl || user.pictureUrl || user.PictureUrl || '',
    };
  }

  loadAvailableUsers(options?: { projectId?: string; groupId?: string }): Observable<User[]> {
    let params = new HttpParams();

    if (options?.projectId) {
      params = params.set('projectId', options.projectId);
    }
    if (options?.groupId) {
      params = params.set('groupId', options.groupId);
    }

    return this.httpClient.get<User[]>(`${environment.apiUrl}/users`, { params }).pipe(
      map(users => users
        .map(u => this.mapToUser(u))
        .filter(u => u.userName?.toLowerCase() !== 'system_user')
      ),
      catchError(error => throwError(() => buildEntityError(error, 'utente', 'caricamento')))
    );
  }

  loadUsers(
    pageNumber = 1, 
    pageSize = 5, 
    filters?: { searchTerm?: string | null }, 
    options?: { projectId?: string; groupId?: string }
  ): Observable<User[]> {
    const url = `${environment.apiUrl}/users`;

    let params = new HttpParams()
      .set('PageNumber', pageNumber.toString())
      .set('PageSize', pageSize.toString());

    if (filters?.searchTerm) {
      params = params.set('SearchTerm', filters.searchTerm);
    }
    if (options?.projectId) {
      params = params.set('projectId', options.projectId);
    }
    if (options?.groupId) {
      params = params.set('groupId', options.groupId);
    }

    return this.httpClient.get<any[]>(url, { params, observe: 'response' }).pipe(
      tap(response => {
        const paginationHeader = response.headers.get('X-Pagination');
        if (paginationHeader) {
          const data = JSON.parse(paginationHeader);
          this.usersPagination.set({
            currentPage: data.CurrentPage,
            totalPages: data.TotalPages,
            pageSize: data.PageSize,
            totalCount: data.TotalCount,
            hasPrevious: data.HasPrevious,
            hasNext: data.HasNext
          });
        }
      }),
      map(response => (response.body || [])
        .map(u => this.mapToUser(u))
        .filter(u => u.userName?.toLowerCase() !== 'system_user')
      ),
      tap(users => this.users.set(users)),
      catchError(error => throwError(() => buildEntityError(error, 'utente', 'caricamento')))
    );
  }
}