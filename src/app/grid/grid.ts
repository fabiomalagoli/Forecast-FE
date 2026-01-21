import { Component, inject } from '@angular/core';
import { CardHome } from './card-home/card-home';
import { GridService } from './grid.service';

@Component({
  selector: 'app-grid',
  imports: [CardHome],
  templateUrl: './grid.html',
  styleUrl: './grid.css',
})
export class Grid {
  private gridService = inject(GridService);

  grid = this.gridService.allCards;
}
