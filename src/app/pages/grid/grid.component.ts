import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CardHomeComponent } from './card-home/card-home.component';
import { CardModel } from './card-home/card-home.model';
import { finalize, Subject, switchMap, tap, timer } from 'rxjs';
import { DashboardService } from '../../shared/services/dashboards.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AppButtonComponent } from '../../shared/button/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-grid',
  imports: [CardHomeComponent, MatProgressSpinnerModule, AppButtonComponent],
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
      finalize(() => this.isFetching.set(false))
    ).subscribe({
      next: (cards: CardModel[]) => {
        this.Cards.set(cards);
        if (showSuccessMessage) {
          this.showMessage$.next({ text: 'Dati Home aggiornati con successo!', type: 'success' });
        }
        console.log('Cards caricate: ', cards);
      },
      error: (error: Error) => {
        this.error.set(`Errore durante il caricamento della Home: ${error.message}`);
      },
    });

    this.destroy.onDestroy(() => {
      sub.unsubscribe();
    });
  }
}
