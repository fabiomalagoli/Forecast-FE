import { Component, computed, inject, input, Input, output, signal } from '@angular/core';
import { Project } from '../../../shared/models/project.model';
import { Column } from '../../../shared/table-row/table.types';
import { TableRowComponent } from "../../../shared/table-row/table-row.component";
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-progetto',
  imports: [TableRowComponent, RouterModule, MatIconModule, MatTooltipModule],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
  host: {
    '[class.cell-right]': 'align === "right"', //classe per allineamento a destra
    '[class.cell-center]': 'align === "center"', //classe per allineamneto al centro
  },
})
export class ProgettoComponent {

  @Input() align: 'left' | 'center' | 'right' = 'left' //allineamento di default a sinistra
  @Input({required: true}) columns!: Column<Project>[];
  project = input.required<Project>();
  selected = input(false);
  edit = output<Project>();

  showUsers = output<Project>();
  manageUsersToproject = output<Project>();

  isSelected = input<string | null>(null);

  // Router usato per aprire il dettaglio del progetto
  private router = inject(Router);

  get colsCount(): number {
      return this.columns.length + 1;
  }

  openEdit(p: Project) {
    this.edit.emit(p);
  }

}
