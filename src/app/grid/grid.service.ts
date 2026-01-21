import { Injectable, signal } from '@angular/core';
import { DUMMY_CARDS } from './grid-dummy';
import { CardModel } from './card-home/card-home.model';

@Injectable({ providedIn: 'root' })
export class GridService {
  private dati = signal<CardModel[]>(DUMMY_CARDS);
  allCards = this.dati.asReadonly();

  //Grid è la home di solo visualizzazione, non serve
  //nessun metodo CRUD per ora.
}
