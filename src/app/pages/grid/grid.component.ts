import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CardHomeComponent } from './card-home/card-home.component';
import { CardModel } from './card-home/card-home.model';
import { finalize } from 'rxjs';
import { DashboardService } from '../../shared/services/dashboards.service';

@Component({
  selector: 'app-grid',
  imports: [CardHomeComponent],
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
})
export class GridComponent {
  Cards = signal<CardModel[] | undefined>(undefined);
  isFetching = signal(false);
  error = signal('');

  private dashboardService = inject(DashboardService);
  private destroy = inject(DestroyRef);

  isGettingCard = false;
  ngOnInit() {
    this.isFetching.set(true);
    const sub = this.dashboardService.loadDashboardCards().pipe(
      finalize(() => this.isFetching.set(false))
    ).subscribe({
      next: (cards: CardModel[]) => {
        this.Cards.set(cards);
        console.log('Cards caricate: ', cards);
      },
      error: (error: Error) => {
        this.error.set(error.message);
      },
    });
    this.destroy.onDestroy(() => {
      sub.unsubscribe();
    });
  }
}
