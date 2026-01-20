import { Component, Input } from '@angular/core';
import { Progetto } from './progetto.model';
import { Column } from '../../shared/table-row/table.types';
import { TableRowComponent } from "../../shared/table-row/table-row";
import { PROGETTO_HEADERS } from './progetto.headers';


@Component({
  selector: 'app-progetto',
  imports: [TableRowComponent],
  templateUrl: './progetto.html',
  styleUrl: './progetto.css',
  host: {
    '[class.cell-right]': 'align === "right"', //classe per allineamento a destra
    '[class.cell-center]': 'align === "center"', //classe per allineamneto al centro
  },
})
export class ProgettoComponent {

  @Input({required: true}) progetto!: Progetto;
  @Input() align: 'left' | 'center' | 'right' = 'left' //allineamento di default a sinistra
  @Input({required: true}) columns!: Column<Progetto>[];

  get colsCount(): number {
      return this.columns.length;
  }
  


}
