import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CardHomeComponent } from './card-home/card-home.component';
import { CardModel } from './card-home/card-home.model';
import { finalize, forkJoin, Subject, switchMap, tap, timer } from 'rxjs';
import { DashboardService } from '../../shared/services/dashboards.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { NotifyAction } from '../../shared/enums/notify.enum';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FavouritesService } from '../../shared/services/favourites.service';
import { getHttpErrorStatusMessage } from '../../shared/utils/http-error-message.utils';

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
  private favoritesService = inject(FavouritesService);

  cards = signal<CardModel[] | undefined>(undefined);
  isFetching = signal(false);
  error = signal<string | null>(null);
  statusMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  // extendedCards = computed(() => {
  //   const rawCards = this.cards() || [];
  //   const dbProjects = this.projects();

  //   return rawCards.map(card => {
  //     const matchingProject = dbProjects.find(project => project.id === card.id);
  //     return {
  //       ...card,
  //       isFavorite: matchingProject ? matchingProject.isFavorite : false
  //     };
  //   },
  //   );
  // });

  // displayedCards = computed(() => {
  //   return this.extendedCards().filter(card => card.isFavorite);
  // });

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

  loadInitialData(forceInitialSpinner = false) {
    // Controlliamo se il servizio ha già dei dati salvati in memoria
    const dataAlreadyLoaded = this.dashboardService.loadedCards().length > 0;

    this.error.set(null);
    this.isInitialLoading.set(forceInitialSpinner || !dataAlreadyLoaded);
    
    if (dataAlreadyLoaded) {
      this.isFetching.set(true);

      this.setExtendedCards(this.dashboardService.loadedCards());

      this.dashboardService.loadFavoriteDashboardCards(this.currentPage(), this.pageSize).pipe(
        finalize(() => {
          this.isFetching.set(false);
          this.isInitialLoading.set(false);
        }),
        takeUntilDestroyed(this.destroy)
      ).subscribe({
        next: (cards) => this.setExtendedCards(cards),
        error: (error) => this.handleError(error)
      });

    } else {
      this.isFetching.set(true);
      this.isInitialLoading.set(true);

      forkJoin([
        this.dashboardService.loadFavoriteDashboardCards(this.currentPage(), this.pageSize),
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
    this.cards.set(cards);
  }

  private handleError(error: Error): void {
    this.error.set(this.buildLoadHomeErrorMessage(error));
    this.snackbarService.error(NotifyAction.Caricamento, 'Home', 'Riprova')
      .onAction().subscribe(() => {
        this.loadInitialData(true);
      });
    console.error('Errore:', error);
  }

  onShowFavoriteOnlyChange() {
    this.showFavoriteOnly.update(current => !current);
  }

  private loadCards(showSuccessMessage = false, forceInitialSpinner = false) {
    this.isFetching.set(true);
    this.isInitialLoading.set(forceInitialSpinner);
    this.error.set(null);

    this.dashboardService.loadFavoriteDashboardCards(this.currentPage(), this.pageSize).pipe(
      finalize(() => {
        this.isFetching.set(false);
        this.isInitialLoading.set(false);
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
        this.error.set(this.buildLoadHomeErrorMessage(error));
        this.snackbarService.error(NotifyAction.Caricamento, 'Home', 'Riprova')
          .onAction().subscribe(() => {
            this.loadCards(showSuccessMessage, true);
          });
        console.error('Errore durante il caricamento delle cards:', error);
      },
    });
  }

  loadPage(pageNumber: number, forceInitialSpinner = false) {
    this.currentPage.set(pageNumber);
    this.isFetching.set(true);
    this.isInitialLoading.set(forceInitialSpinner);
    this.error.set(null);

    this.dashboardService.loadFavoriteDashboardCards(pageNumber, this.pageSize).pipe(
      finalize(() => {
        this.isFetching.set(false);
        this.isInitialLoading.set(false);
      }),
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
        this.error.set(this.buildLoadHomeErrorMessage(error));
        this.snackbarService.error(NotifyAction.Caricamento, 'Home', 'Riprova')
          .onAction().subscribe(() => {
            this.loadPage(pageNumber, true);
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

  private buildLoadHomeErrorMessage(error: Error): string {
    return `Errore durante il caricamento della Home: ${getHttpErrorStatusMessage(error)}`;
  }
}
