import { Component, Input } from '@angular/core';
import { Column } from '../../shared/table-row/table.types';
import { TableRowComponent } from "../../shared/table-row/table-row";
import { ModelloCliente } from './cliente.model';
import { AppButton } from '../../shared/button/button';

@Component({
  selector: 'app-cliente',
  imports: [AppButton, TableRowComponent],
  templateUrl: './cliente.html',
  styleUrl: './cliente.css',
  host: {
    '[class.cell-right]': 'align === "right"', //Classe per allineamento a destra.
    '[class.cell-center]': 'align === "center"', //Classe per allineamneto al centro.
  },
})
export class Cliente {
  @Input({required: true}) cliente!: ModelloCliente;
  @Input() align: 'left' | 'center' | 'right' = 'left' //Allineamento di default a sinistra.
  @Input({required: true}) columns!: Column<ModelloCliente>[];

  get colsCount(): number {
    return this.columns.length + 1;
  }
}