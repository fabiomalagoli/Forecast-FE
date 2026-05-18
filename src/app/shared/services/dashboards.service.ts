import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, throwError } from 'rxjs';
import { CardModel } from '../../pages/grid/card-home/card-home.model';
import { environment } from '../../../environments/environment.development';

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
        employeeCount: card.assignmentSummary?.employeesCount,
        totalBudget: card.totalBudget,
      }))),
      tap(cards => this.dashboardCards.set(cards)),
      catchError(error => {
        console.error(error);
        return throwError(() => new Error('Something went wrong. Please try again later.'));
      })
    );
  }
}