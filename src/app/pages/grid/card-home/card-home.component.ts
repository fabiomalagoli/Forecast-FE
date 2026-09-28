import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModel, CardModelWithFavorite } from './card-home.model';

@Component({
  selector: 'app-card-home',
  imports: [RouterLink],
  templateUrl: './card-home.component.html',
  styleUrl: './card-home.component.scss',
})
export class CardHomeComponent {
  cards = input.required<CardModel>();
}
