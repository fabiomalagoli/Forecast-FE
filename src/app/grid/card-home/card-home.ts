import { Component, Input, input } from '@angular/core';
import { CardModel } from './card-home.model';

@Component({
  selector: 'app-card-home',
  imports: [],
  templateUrl: './card-home.html',
  styleUrl: './card-home.css',
})
export class CardHomeComponent {
  @Input() cards!: CardModel;
}
