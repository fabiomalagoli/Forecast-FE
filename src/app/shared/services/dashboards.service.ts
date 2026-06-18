import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, throwError } from 'rxjs';
import { CardModel } from '../../pages/grid/card-home/card-home.model';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private httpClient = inject(HttpClient);
  private dashboardCardsPagination = signal<any>(null);
  private dashboardCards = signal<CardModel[]>([]);
  loadedCards = this.dashboardCards.asReadonly();
  paginationData = this.dashboardCardsPagination.asReadonly();


  private mapToDashboards(card: any): CardModel{
    return {
      customer: card.customer,
      activity: card.activity,
      projectStatus: card.projectStatus,
      projectName: card.name || card.projectName || card.title || card.progetto || '',
      id: card.id || card.Id,
      employeeCount: card.assignmentSummary?.employeesCount,
      totalBudget: card.totalBudget,
    }
  }

  loadAllFavoriteDashboardCards() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projects/favorites/all/summary`).pipe(
      map(cards => cards.map(card => this.mapToDashboards(card))),
      tap(cards => this.dashboardCards.set(cards)),
      catchError(error => {
        console.error('Errore nel caricamento preferiti:', error);
        return throwError(() => buildEntityError(error, 'progetto', 'caricamento'));
      })
    );
  }

  loadFavoriteDashboardCards(pageNumber: number = 1, pageSize: number = 10) {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projects/favorites/summary?PageNumber=${pageNumber}&PageSize=${pageSize}`, { observe: 'response' }).pipe(
      tap(response => {
        const paginationHeader = response.headers.get('X-Pagination');
        if (paginationHeader) {
          const data = JSON.parse(paginationHeader);
          this.dashboardCardsPagination.set({
            currentPage: data.CurrentPage,
            totalPages: data.TotalPages,
            pageSize: data.PageSize,
            totalCount: data.TotalCount,
            hasPrevious: data.HasPrevious,
            hasNext: data.HasNext
          });
        }
        const cards = (response.body || []).map(card => this.mapToDashboards(card));
        this.dashboardCards.set(cards);
      }),
      map(response => (response.body || []).map(card => this.mapToDashboards(card)))
    );
  }

  loadDashboardCardsPagination(pageNumber: number = 1, pageSize: number = 10) {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projects/summary?PageNumber=${pageNumber}&PageSize=${pageSize}`, { observe: 'response' }).pipe(
      tap(response => {
        const paginationHeader = response.headers.get('X-Pagination');
        if (paginationHeader) {
          const data = JSON.parse(paginationHeader);
          this.dashboardCardsPagination.set({
            currentPage: data.CurrentPage,
            totalPages: data.TotalPages,
            pageSize: data.PageSize,
            totalCount: data.TotalCount,
            hasPrevious: data.HasPrevious,
            hasNext: data.HasNext
          });
        }
        const cards = (response.body || []).map(card => this.mapToDashboards(card));
        this.dashboardCards.set(cards);
      }),
      map(response => (response.body || []).map(card => this.mapToDashboards(card)))
    );
  }

  loadDashboardCards() {
    return this.httpClient.get<any[]>(`${environment.apiUrl}/projects/summary`).pipe(
      map(summary => summary.map(card => this.mapToDashboards(card))),
      tap(cards => this.dashboardCards.set(cards)),
      catchError(error => {
        console.error(error);
        return throwError(() => buildEntityError(error, 'progetto', 'caricamento'));
      })
    );
  }
}
