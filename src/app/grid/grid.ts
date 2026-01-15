import { Component, EventEmitter, Output } from '@angular/core';
import { CardHome } from './card-home/card-home';

@Component({
  selector: 'app-grid',
  imports: [CardHome],
  templateUrl: './grid.html',
  styleUrl: './grid.css',
})
export class Grid {}
