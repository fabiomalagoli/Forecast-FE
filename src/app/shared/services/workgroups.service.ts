import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, tap, throwError, of } from 'rxjs';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';
import { WorkGroup } from '../models/workgroups.model';

@Injectable({ providedIn: 'root' })
export class WorkGroupsService {
    private errorService = inject(ErrorService);
    private httpClient = inject(HttpClient);

    private workGroups = signal<WorkGroup[]>([]);
    private allWorkGroups = signal<WorkGroup[]>([]);
    private workGroupsPagination = signal<any>(null);
    private lastSelectedWorkGroup = signal<WorkGroup | null>(null);

    loadedWorkGroups = this.workGroups.asReadonly();
    loadedAllworkGroups = this.allWorkGroups.asReadonly();
    paginationData = this.workGroupsPagination.asReadonly();
    lastWorkGroupSelected = this.lastSelectedWorkGroup.asReadonly();

    setLastSelectedWorkGroup(workGroup: WorkGroup | null) {
        this.lastSelectedWorkGroup.set(workGroup);
    }

    private mapToWorkGroup(workGroup: any): WorkGroup {
    return {
        id: workGroup.id,
        name: workGroup.name ?? workGroup.Name,
        employees: workGroup.employees || [] // Passi direttamente l'array di oggetti
    };
}

    // --- WORK GROUPS ---
    loadWorkGroups(pageNumber: number = 1, pageSize: number = 10, filters?: { searchTerm?: string | null }) {
        let url = `${environment.apiUrl}/groups?PageNumber=${pageNumber}&PageSize=${pageSize}`;

        let params = new HttpParams();
        if (filters?.searchTerm) {
            params = params.set('SearchTerm', filters.searchTerm);
        }
        return this.httpClient.get<any[]>(url, { params, observe: 'response' }).pipe(
            tap(response => {
            const paginationHeader = response.headers.get('X-Pagination');
            if (paginationHeader) {
                const data = JSON.parse(paginationHeader);
                this.workGroupsPagination.set({
                currentPage: data.CurrentPage,
                totalPages: data.TotalPages,
                pageSize: data.PageSize,
                totalCount: data.TotalCount,
                hasPrevious: data.HasPrevious,
                hasNext: data.HasNext
                });
            }
            const groups = (response.body || []).map(r => this.mapToWorkGroup(r));
            this.workGroups.set(groups);
            }),
            map(response => (response.body || []).map(r => this.mapToWorkGroup(r))),
        );
    }

    loadAllWorkGroups() {
        return this.httpClient.get<any[]>(`${environment.apiUrl}/groups`, { observe: 'response' }).pipe(
            tap(response => {
            const groups = (response.body || []).map(r => this.mapToWorkGroup(r));
            this.allWorkGroups.set(groups);
            }),
            map(response => (response.body || []).map(r => this.mapToWorkGroup(r))),
        );
    }

    addWorkGroup(payload: any) {
        return this.httpClient.post(`${environment.apiUrl}/groups`, payload, {
        }).pipe(
            tap((created: any) => {
                if (created?.id) {
                    this.allWorkGroups.update(prev => [...prev, this.mapToWorkGroup(created)]);
                    this.workGroups.update(prev => [...prev, this.mapToWorkGroup(created)]);
                }
            }),
            catchError(error => {
                this.errorService.showError('Errore durante l\'aggiunta del gruppo.');
                return throwError(() => buildEntityError(error, 'gruppo', 'creazione'));
            })
        );
    }
    updateWorkGroup(workGroup: WorkGroup, payload: any) {
        return this.httpClient.put(`${environment.apiUrl}/groups/${workGroup.id}`, payload).pipe(
            tap(() => {
            this.workGroups.update(prev => prev.map(r => r.id === workGroup.id ? { ...r, ...workGroup } : r));
            this.allWorkGroups.update(prev => prev.map(r => r.id === workGroup.id ? { ...r, ...workGroup } : r));
            }),
            catchError(error => {
            this.errorService.showError('Errore durante l\'aggiornamento del gruppo.');
            return throwError(() => buildEntityError(error, 'gruppo', 'aggiornamento'));
            })
        );
    }

    toggleEliminatedState(workGroupId: string, isEliminated: boolean) {
        const patchPayload = [
            { op: 'replace', path: '/isEliminated', value: isEliminated }
        ];

        const headers = new HttpHeaders({
            'Content-Type': 'application/json-patch+json'
        });

        return this.httpClient.patch(`${environment.apiUrl}/groups/${encodeURIComponent(workGroupId)}/isEliminated`, patchPayload, { headers }).pipe(
            tap(() => {
            this.workGroups.update(prev => prev.map(j => j.id === workGroupId ? {...j, isEliminated} : j));
            })
        );
    }

}
