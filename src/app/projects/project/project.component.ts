import { Component, inject, input, Input, output, signal } from '@angular/core';
import { Project } from './project.model';
import { Column } from '../../shared/table-row/table.types';
import { TableRowComponent } from "../../shared/table-row/table-row";
import { AppButtonComponent } from '../../shared/button/button';
import { Router, RouterModule } from '@angular/router';


@Component({
  selector: 'app-progetto',
  imports: [TableRowComponent, AppButtonComponent, RouterModule],
  templateUrl: './project.component.html',
  styleUrl: './project.component.css',
  host: {
    '[class.cell-right]': 'align === "right"', //classe per allineamento a destra
    '[class.cell-center]': 'align === "center"', //classe per allineamneto al centro
  },
})
export class ProgettoComponent {

  @Input() align: 'left' | 'center' | 'right' = 'left' //allineamento di default a sinistra
  @Input({required: true}) columns!: Column<Project>[];
  project = input.required<Project>();
  edit = output<Project>();

  // Router usato per aprire il dettaglio del progetto
  private router = inject(Router);

  get colsCount(): number {
      return this.columns.length + 1;
  }

  openEdit(p: Project) {
    this.edit.emit(p);
  }

}
