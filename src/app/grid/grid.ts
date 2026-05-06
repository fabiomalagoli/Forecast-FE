import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CardHomeComponent } from './card-home/card-home';
import { RequestsService } from '../shared/requests.service';
import { CardModel } from './card-home/card-home.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-grid',
  imports: [CardHomeComponent],
  templateUrl: './grid.html',
  styleUrl: './grid.css',
})
export class GridComponent {
  Cards = signal<CardModel[] | undefined>(undefined);
  isFetching = signal(false);
  error = signal('');

  private requestService = inject(RequestsService);
  private destroy = inject(DestroyRef);

  isGettingCard = false;
  ngOnInit() {
    this.isFetching.set(true);
    const sub = this.requestService.caricaCardsDisponibili().pipe(
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
