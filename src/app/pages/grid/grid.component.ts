import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { CardHomeComponent } from './card-home/card-home.component';
import { CardModel, CardModelWithFavorite } from './card-home/card-home.model';
import { finalize, forkJoin, Subject, switchMap, tap, timer } from 'rxjs';
import { DashboardService } from '../../shared/services/dashboards.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { NotifyAction } from '../../shared/enums/notify.enum';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ProjectsService } from '../../shared/services/projects.service';
import { FavouritesService } from '../../shared/services/favourites.service';

@Component({
  selector: 'app-grid',
  imports: [CardHomeComponent, MatProgressSpinnerModule, MatPaginatorModule],
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
})
export class GridComponent {
  private dashboardService = inject(DashboardService);
  private destroy = inject(DestroyRef);
  private showMessage$ = new Subject<{ text: string; type: 'success' | 'error' }>();
  private snackbarService = inject(SnackbarService);
  private projectsService = inject(ProjectsService);
  private favoritesService = inject(FavouritesService);

  cards = signal<CardModelWithFavorite[] | undefined>(undefined);
  projectCards = signal<CardModelWithFavorite[] | undefined>(undefined);
  isFetching = signal(false);
  error = signal<string | null>(null);
  statusMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);
  projects = this.projectsService.loadedProjects;

  displayedCards = computed(() => {
    const allCards = this.cards();
    const showOnlyFavorites = this.showFavoriteOnly();

    if (showOnlyFavorites) {
      return allCards?.filter(card => card.isFavorite);
    }

    return allCards;
  });

  isInitialLoading = signal(this.dashboardService.loadedCards().length === 0);

  isGettingCard = false;

  showFavoriteOnly = signal(false);

  currentPage = signal(this.dashboardService.paginationData()?.currentPage || 1);
  pageSize = this.dashboardService.paginationData()?.pageSize || 10;
  pagination = this.dashboardService.paginationData;

  constructor() {
    this.showMessage$.pipe(
      tap(message => this.statusMessage.set(message)),
      switchMap(() => timer(3000)),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.statusMessage.set(null);
    });
    this.loadInitialData();
  }

  ngOnInit() {
    // this.loadCards();
  }

  reloadCards() {
    this.loadCards(true);
  }

  loadInitialData() {
    this.error.set(null);
    
    // Controlliamo se il servizio ha già dei dati salvati in memoria
    const dataAlreadyLoaded = this.dashboardService.loadedCards().length > 0;

    if (dataAlreadyLoaded) {
      this.isFetching.set(true);
      this.isInitialLoading.set(false);

      this.setExtendedCards(this.dashboardService.loadedCards());

      this.dashboardService.loadDashboardCardsPagination(this.currentPage(), this.pageSize).pipe(
        finalize(() => this.isFetching.set(false)),
        takeUntilDestroyed(this.destroy)
      ).subscribe({
        next: (cards) => this.setExtendedCards(cards),
        error: (error) => this.handleError(error)
      });

    } else {
      this.isFetching.set(true);
      this.isInitialLoading.set(true);

      forkJoin([
        this.dashboardService.loadDashboardCardsPagination(this.currentPage(), this.pageSize),
        timer(1500)
      ]).pipe(
        finalize(() => {
          this.isFetching.set(false);
          this.isInitialLoading.set(false);
        }),
        takeUntilDestroyed(this.destroy)
      ).subscribe({
        next: (results) => this.setExtendedCards(results[0]),
        error: (error) => this.handleError(error)
      });
    }
  }

  private setExtendedCards(cards: CardModel[]): void {
    const extendedCards = cards.map(card => ({
      ...card,
      isFavorite: this.favoritesService.isFavorite(card.id)
    }));
    this.cards.set(extendedCards);
    console.log('Cards aggiornate nel segnale: ', extendedCards);
  }

  private handleError(error: Error): void {
    this.error.set(`Errore durante il caricamento della Home: ${error.message}`);
    this.snackbarService.error(NotifyAction.ErroreCaricamento, 'Home', 'Riprova')
      .onAction().subscribe(() => {
        this.loadInitialData();
      });
    console.error('Errore:', error);
  }

  onShowFavoriteOnlyChange() {
    this.showFavoriteOnly.update(current => !current);
  }

  private loadCards(showSuccessMessage = false) {
    this.isFetching.set(true);
    this.error.set(null);

    this.dashboardService.loadDashboardCardsPagination(this.currentPage(), this.pageSize).pipe(
      finalize(() => {
        this.isFetching.set(false);
      }),
      takeUntilDestroyed(this.destroy)
    ).subscribe({
      next: (results) => {
        const cards = results;
          const extendedCards = cards.map(card => ({
          ...card,
          isFavorite: this.favoritesService.isFavorite(card.id)
        }));
        this.cards.set(extendedCards);
        console.log('Cards caricate: ', extendedCards);
      },
      error: (error: Error) => {
        this.error.set(`Errore durante il caricamento della Home: ${error.message}`);
        this.snackbarService.error(NotifyAction.ErroreCaricamento, 'Home', 'Riprova')
          .onAction().subscribe(() => {
            this.loadCards(showSuccessMessage);
          });
        console.error('Errore durante il caricamento delle cards:', error);
      },
    });
  }

  loadPage(pageNumber: number) {
    this.currentPage.set(pageNumber);
    this.isFetching.set(true);
    this.error.set(null);

    this.dashboardService.loadDashboardCardsPagination(pageNumber, this.pageSize).pipe(
      finalize(() => this.isFetching.set(false)),
      takeUntilDestroyed(this.destroy)
    ).subscribe({
      next: (cards) => {
      const extendedCards = cards.map(card => ({
          ...card,
          isFavorite: this.favoritesService.isFavorite(card.id)
        }));
        this.cards.set(extendedCards);
        console.log(`Cards caricate per pagina ${pageNumber}: `, extendedCards);
      },
      error: (error: Error) => {
        this.error.set(`Errore durante il caricamento della pagina ${pageNumber}: ${error.message}`);
        this.snackbarService.error(NotifyAction.ErroreCaricamento, `pagina ${pageNumber}`, 'Riprova')
          .onAction().subscribe(() => {
            this.loadPage(pageNumber);
          });
        console.error(`Errore durante il caricamento delle cards per pagina ${pageNumber}:`, error);
      },
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.loadPage(event.pageIndex + 1);
  }

  showNotification(type: 'success' | 'error', action: NotifyAction, params?: string | string[]) {
    if (type === 'success') {
      this.snackbarService.success(action, params);
    } else {
      this.snackbarService.error(action, params ?? []);
    }
  }
}
