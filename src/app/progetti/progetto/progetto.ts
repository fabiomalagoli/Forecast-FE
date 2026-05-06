import { Component, inject, input, Input, output, signal } from '@angular/core';
import { Progetto } from './progetto.model';
import { Column } from '../../shared/table-row/table.types';
import { TableRowComponent } from "../../shared/table-row/table-row";
import { AppButtonComponent } from '../../shared/button/button';
import { Router, RouterModule } from '@angular/router';


@Component({
  selector: 'app-progetto',
  imports: [TableRowComponent, AppButtonComponent, RouterModule],
  templateUrl: './progetto.html',
  styleUrl: './progetto.css',
  host: {
    '[class.cell-right]': 'align === "right"', //classe per allineamento a destra
    '[class.cell-center]': 'align === "center"', //classe per allineamneto al centro
  },
})
export class ProgettoComponent {

  @Input() align: 'left' | 'center' | 'right' = 'left' //allineamento di default a sinistra
  @Input({required: true}) columns!: Column<Progetto>[];
  progetto = input.required<Progetto>();
  edit = output<Progetto>();

  // Router usato per aprire il dettaglio del progetto
  private router = inject(Router);

  get colsCount(): number {
      return this.columns.length + 1;
  }

  apriModifica(p: Progetto) {
    this.edit.emit(p);
  }

}
