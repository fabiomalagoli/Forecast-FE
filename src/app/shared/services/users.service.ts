import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, tap, throwError, of, Observable } from 'rxjs';
import { User } from '../models/user.model';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';
import { Project } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private errorService = inject(ErrorService);
  private httpClient = inject(HttpClient);


  private usersPagination = signal<any>(null);
  private userProjectPagination = signal<any>(null);


  private users = signal<User[]>([]);
  private allUsers = signal<User[]>([]);

  private userProjects = signal<Project[]>([]);
  loadedUserProjects = this.userProjects.asReadonly();
  loadedUsers = this.users.asReadonly();
  allUsersLoaded = this.allUsers.asReadonly();
  userPaginationData = this.usersPagination.asReadonly();
  userProjectsPaginationData = this.userProjectPagination.asReadonly();

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
  /* In futuro potrebbe essere utilizzato per caricare gli utenti in maniera paginata e potrebbero essere aggiunti filtri */
  loadUsers(pageNumber: number = 1, pageSize: number = 10, filters?: { searchTerm?: string | null }) {
    let url = `${environment.apiUrl}/users/active?PageNumber=${pageNumber}&PageSize=${pageSize}`;

    let params = new HttpParams();

    if (filters?.searchTerm) {
      params = params.set('SearchTerm', filters.searchTerm);
    }
    return this.httpClient.get<User[]>(url, { params, observe: 'response' }).pipe(
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
        const users = (response.body || []).map(c => this.mapToUser(c));
        this.users.set(users);
      }),
      map(response => (response.body || []).map(c => this.mapToUser(c))),
    );
  }

  updateUser(username: string, payload: any, uiFallback: User) {
    return this.httpClient.put(`${environment.apiUrl}/users/${encodeURIComponent(username)}`, payload).pipe(
      tap(() => {
        this.upsertUser(uiFallback);
      }),
      catchError(error => {
        this.errorService.showError('Errore durante l\'aggiornamento dell\'utente.');
        return throwError(() => buildEntityError(error, 'utente', 'aggiornamento'));
      })
    );
  }

//   loadUserById(username: string): Observable<User> {
//     const cached = this.users().find(c => c.username === username);
//     if (cached) return of(cached);

//     return this.httpClient.get<User>(`${environment.apiUrl}/users/${encodeURIComponent(username)}`).pipe(
//       map(c => this.mapToUser(c)),
//       tap(c => {
//         const prev = this.users();
//         const next = prev.some(x => x.username === c.username) ? prev.map(x => (x.username === c.username ? c : x)) : [...prev, c];
//         this.users.set(next);
//       }),
//       catchError(error => throwError(() => buildEntityError(error, 'utente', 'caricamento')))
//     );
//   }

  setUserSearchTerm(value: string) {
    this.loadUsers(1, 10, { searchTerm: value }).pipe(
      tap(users => {
        this.users.set(users);
      })
    ).subscribe();
  }

  updateUserLocal(user: User) {
    this.upsertUser(user);
  }

  private upsertUser(user: User) {
    this.users.update(prev =>
      prev.some(item => item.userName === user.userName)
        ? prev.map(item => (item.userName === user.userName ? user : item))
        : [...prev, user]
    );

    this.allUsers.update(prev =>
      prev.some(item => item.userName === user.userName)
        ? prev.map(item => (item.userName === user.userName ? user : item))
        : [...prev, user]
    );
  }

}
