import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, throwError, of, Observable } from 'rxjs';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';

export interface ProjectMemberForCreationDto {
  userId: string;
  role: string;
}

export interface ProjectMemberForUpdateDto {
  role: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectMembersService {
    private errorService = inject(ErrorService);
    private httpClient = inject(HttpClient);

    addMemberToProject(projectId: string, userId: string, role: string): Observable<void> {
        if (!userId || userId.trim() === '') {
            console.error('ERRORE: Tentativo di creazione di un membro con userId vuoto!', { userId, role });
        }

        const payload = {
            userId: userId,
            role: role
        };

        return this.httpClient.post<void>(
            `${environment.apiUrl}/projects/${projectId}/members`,
            payload
        );
    }

    updateMemberRole(projectId: string, userId: string, role: string): Observable<void> {
        const payload: ProjectMemberForUpdateDto = { role };
        return this.httpClient
        .put<void>(`${environment.apiUrl}/projects/${projectId}/members/${userId}`, payload)
        .pipe(
            catchError(error => {
            this.errorService.showError("Errore durante l'aggiornamento del ruolo.");
            return throwError(() => buildEntityError(error, 'membri', 'aggiornamento'));
            })
        );
    }

    removeMemberFromProject(projectId: string, userId: string): Observable<void> {
        return this.httpClient
        .delete<void>(`${environment.apiUrl}/projects/${projectId}/members/${userId}`)
        .pipe(
            catchError(error => {
            this.errorService.showError("Errore durante la rimozione del membro.");
            return throwError(() => buildEntityError(error, 'membri', 'eliminazione'));
            })
        );
    }

}
