import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table-row',
  imports: [],
  templateUrl: './table-row.html',
  styleUrl: './table-row.css',
  host: {
    class: 'tbl-row',
    '[style.grid-template-columns]': 'gridTemplate',
    '[attr.role]': '"row"'
  }
})
export class TableRowComponent {
  @Input({required: true}) cols = 1; //così si ha almeno una colonna nella tabella

  get gridTemplate(){
    const safeCols = Math.max(1, Number(this.cols) || 1); //per avere un numero positivo >= 1 come numero di colonne
    return `repeat(${safeCols}, minmax(0, 1fr))`; // ripetizione per numero di colonne di frazioni eguali di spazio disponibile
  }

}
