import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CardHomeComponent } from './card-home/card-home.component';
import { CardModel } from './card-home/card-home.model';
import { finalize, Subject, switchMap, tap, timer } from 'rxjs';
import { DashboardService } from '../../shared/services/dashboards.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AppButtonComponent } from '../../shared/button/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { NotifyAction } from '../../shared/enums/notify.enum';

@Component({
  selector: 'app-grid',
  imports: [CardHomeComponent, MatProgressSpinnerModule],
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
})
export class GridComponent {
  Cards = signal<CardModel[] | undefined>(undefined);
  isFetching = signal(false);
  error = signal('');
  statusMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  private dashboardService = inject(DashboardService);
  private destroy = inject(DestroyRef);
  private showMessage$ = new Subject<{ text: string; type: 'success' | 'error' }>();
  private snackbarService = inject(SnackbarService);

  isInitialLoading = signal(this.dashboardService.loadedCards().length === 0);

  isGettingCard = false;

  constructor() {
    this.showMessage$.pipe(
      tap(message => this.statusMessage.set(message)),
      switchMap(() => timer(3000)),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.statusMessage.set(null);
    });
  }

  ngOnInit() {
    this.loadCards();
  }

  reloadCards() {
    this.loadCards(true);
  }

  private loadCards(showSuccessMessage = false) {
    this.isFetching.set(true);
    this.error.set('');

    const sub = this.dashboardService.loadDashboardCards().pipe(
      finalize(() => { timer(1500).subscribe(() => { this.isFetching.set(false); this.isInitialLoading.set(false); }); })
    ).subscribe({
      next: (cards: CardModel[]) => {
        this.Cards.set(cards);
        if (showSuccessMessage) {
          this.showNotification('success', NotifyAction.Ricaricamento, 'Home');
          //this.showMessage$.next({ text: 'Home ricaricata con successo!', type: 'success' });
        }
        console.log('Cards caricate: ', cards);
      },
      error: (error: Error) => {
        this.error.set(`Errore durante il caricamento della Home: ${error.message}`);
        this.showNotification('error', NotifyAction.ErroreCaricamento, 'Home');
        //this.showMessage$.next({ text: 'Errore durante il caricamento della Home', type: 'error' });
        console.error('Errore durante il caricamento delle cards:', error);
      },
    });

    this.destroy.onDestroy(() => {
      sub.unsubscribe();
    });
  }

  showNotification(type: 'success' | 'error', action: NotifyAction, params?: string | string[]) {
    if (type === 'success') {
      this.snackbarService.success(action, params);
    } else {
      this.snackbarService.error(action, params ?? []);
    }
  }
}
