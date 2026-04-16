import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CardHome } from './card-home/card-home';
import { RequestsService } from '../shared/requests.service';
import { CardModel } from './card-home/card-home.model';

@Component({
  selector: 'app-grid',
  imports: [CardHome],
  templateUrl: './grid.html',
  styleUrl: './grid.css',
})
export class Grid {
  Cards = signal<CardModel[] | undefined>(undefined);
  isFetching = signal(false);
  error = signal('');

  private requestService = inject(RequestsService);
  private destroy = inject(DestroyRef);

  isGettingCard = false;
  ngOnInit() {
    this.isFetching.set(true);
    const sub = this.requestService.caricaCardsDisponibili().subscribe({
      next: (cards: CardModel[]) => {
        this.Cards.set(cards);
        console.log('Cards caricate: ', cards);
      },
      error: (error: Error) => {
        this.error.set(error.message);
      },
      complete: () => {
        this.isFetching.set(false);
      },
    });
    this.destroy.onDestroy(() => {
      sub.unsubscribe();
    });
  }
}
