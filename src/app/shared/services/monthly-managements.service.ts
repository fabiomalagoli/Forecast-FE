import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import {
    MonthlyManagement,
    MonthlyManagementApiResponse,
    MonthlyManagementSavePayload,
} from '../models/monthly-management.model';
import { ErrorService } from '../error.service';

@Injectable({ providedIn: 'root' })
export class MonthlyManagementsService {
    private httpClient = inject(HttpClient);
    private errorService = inject(ErrorService);

    private MonthlyManagements = signal<MonthlyManagement[]>([]);

    loadedMonthlyManagements = this.MonthlyManagements.asReadonly();

    private fetchMonthsForEmployee(projectEmployeeId: string, year: number) {
        const url = `${environment.apiUrl}/projectemployees/${encodeURIComponent(projectEmployeeId)}/monthlymanagement/${year}`;
        
        return this.httpClient.get<MonthlyManagementApiResponse[]>(url).pipe(
        tap((resData) => console.log('Risposta dal backend (monthly management):', resData)),
        map((data) => data.map((item) => this.toMonthlyManagement(item))),
        catchError((error) => {
            console.error(error);
            return throwError(() => new Error('Qualcosa è andato storto nel caricamento dei mesi.'));
        })
        );
    }

    caricaMonthsForEmployee(projectEmployeeId: string, year: number) {
        return this.fetchMonthsForEmployee(projectEmployeeId, year).pipe(
            tap((managements) => this.MonthlyManagements.set(managements))
        );
    }

    salvaMonthsForEmployee(projectEmployeeId: string, year: number, monthsToSave: MonthlyManagementSavePayload[]) {
        const url = `${environment.apiUrl}/projectemployees/${encodeURIComponent(projectEmployeeId)}/monthlymanagement/${year}`;

        const payload = monthsToSave.map(m => ({
            month: m.month,
            days: m.days,
            isConfirmed: m.isConfirmed ?? false
        }));

        return this.httpClient.put<MonthlyManagementApiResponse[] | null>(url, payload).pipe(
            tap(() => {
            // Aggiorniamo il segnale locale con i nuovi dati salvati
            this.MonthlyManagements.update(prev => {
                const savedMonths = monthsToSave.map(month => {
                    const existingMonth = prev.find(item =>
                        item.projectEmployeeId === projectEmployeeId &&
                        item.year === year &&
                        item.month === month.month
                    );

                    return {
                        id: existingMonth?.id ?? '',
                        year,
                        projectEmployeeId,
                        ...month,
                    };
                });

                return [
                    ...prev.filter(item => item.projectEmployeeId !== projectEmployeeId || item.year !== year),
                    ...savedMonths,
                ];
            });
            }),
            catchError((error) => {
            this.errorService.showError('Errore durante il salvataggio della gestione mensile.');
            return throwError(() => error);
            })
        );
    }

    private toMonthlyManagement(item: MonthlyManagementApiResponse): MonthlyManagement {
        return {
            id: item.Id ?? item.id ?? '',
            year: item.Year ?? item.year ?? 0,
            month: item.Month ?? item.month ?? 0,
            days: item.Days ?? item.days ?? 0,
            isConfirmed: item.IsConfirmed ?? item.isConfirmed ?? false,
            projectEmployeeId: item.ProjectEmployeeId ?? item.projectEmployeeId ?? '',
        };
    }
}
