import { Component, inject, input, Input, output } from '@angular/core';
import { Column } from '../../../shared/table-row/table.types';
import { TableRowComponent } from "../../../shared/table-row/table-row.component";
import { Customer } from '../../../shared/models/customer.model';
import { AppButtonComponent } from '../../../shared/button/button';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-cliente',
  imports: [AppButtonComponent, TableRowComponent, RouterModule],
  templateUrl: './customer.component.html',
  styleUrl: './customer.component.scss',
  host: {
    '[class.cell-right]': 'align === "right"', //Classe per allineamento a destra.
    '[class.cell-center]': 'align === "center"', //Classe per allineamneto al centro.
  },
})
export class CustomerComponent {
  @Input() align: 'left' | 'center' | 'right' = 'left' //Allineamento di default a sinistra.
  @Input({required: true}) columns!: Column<Customer>[];
  customer = input.required<Customer>();
  edit = output<Customer>();

  private router = inject(Router);

  get colsCount(): number {
    return this.columns.length + 1; //+1 per la colonna dei bottoni
  }

  openEdit(c: Customer) {
    this.edit.emit(c);
  }
}
