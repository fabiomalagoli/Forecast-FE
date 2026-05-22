import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, throwError } from 'rxjs';
import { CardModel } from '../../pages/grid/card-home/card-home.model';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private httpClient = inject(HttpClient);

  private dashboardCards = signal<CardModel[]>([]);
  loadedCards = this.dashboardCards.asReadonly();

  loadDashboardCards() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projects/summary`).pipe(
      map(summary => summary.map(card => ({
        customer: card.customer,
        activity: card.activity,
        projectStatus: card.projectStatus,
        projectName: card.projectName || card.name || card.title || card.progetto || '',
        employeeCount: card.assignmentSummary?.employeesCount,
        totalBudget: card.totalBudget,
      }))),
      tap(cards => this.dashboardCards.set(cards)),
      catchError(error => {
        console.error(error);
        return throwError(() => buildEntityError(error, 'progetto', 'caricamento'));
      })
    );
  }
}
