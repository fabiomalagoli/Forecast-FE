import { Component, inject, input, Input, output } from '@angular/core';
import { Column } from '../../shared/table-row/table.types';
import { TableRowComponent } from "../../shared/table-row/table-row";
import { Cliente } from './cliente.model';
import { AppButton } from '../../shared/button/button';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-cliente',
  imports: [AppButton, TableRowComponent, RouterModule],
  templateUrl: './cliente.html',
  styleUrl: './cliente.css',
  host: {
    '[class.cell-right]': 'align === "right"', //Classe per allineamento a destra.
    '[class.cell-center]': 'align === "center"', //Classe per allineamneto al centro.
  },
})
export class ClienteComponent {
  @Input() align: 'left' | 'center' | 'right' = 'left' //Allineamento di default a sinistra.
  @Input({required: true}) columns!: Column<Cliente>[];
  cliente = input.required<Cliente>();
  edit = output<Cliente>();

  private router = inject(Router);

  get colsCount(): number {
    return this.columns.length + 1; //+1 per la colonna dei bottoni
  }

  apriModifica(c: Cliente) {
    this.edit.emit(c);
  }
}