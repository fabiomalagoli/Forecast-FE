import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, throwError, of, Observable } from 'rxjs';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';

export interface GroupMemberForCreationDto {
  userId: string;
  role: string;
}

export interface GroupMemberForUpdateDto {
  role: string;
}

@Injectable({ providedIn: 'root' })
export class WorkGroupMembersService {
    private errorService = inject(ErrorService);
    private httpClient = inject(HttpClient);

    addMemberToWorkGroup(workGroupId: string, userId: string, role: string): Observable<void> {
        if (!userId || userId.trim() === '') {
            console.error('ERRORE: Tentativo di creazione di un membro con userId vuoto!', { userId, role });
        }

        const payload = {
            userId: userId,
            role: role
        };

        return this.httpClient.post<void>(
            `${environment.apiUrl}/groups/${workGroupId}/members`,
            payload
        );
    }

    updateMemberRole(workGroupId: string, userId: string, role: string): Observable<void> {
        const payload: GroupMemberForUpdateDto = { role };
        return this.httpClient
        .put<void>(`${environment.apiUrl}/groups/${workGroupId}/members/${userId}`, payload)
        .pipe(
            catchError(error => {
            this.errorService.showError("Errore durante l'aggiornamento del ruolo.");
            return throwError(() => buildEntityError(error, 'membri', 'aggiornamento'));
            })
        );
    }

    removeMemberFromWorkGroup(workGroupId: string, userId: string): Observable<void> {
        return this.httpClient
        .delete<void>(`${environment.apiUrl}/groups/${workGroupId}/members/${userId}`)
        .pipe(
            catchError(error => {
            this.errorService.showError("Errore durante la rimozione del membro.");
            return throwError(() => buildEntityError(error, 'membri', 'eliminazione'));
            })
        );
    }

}
