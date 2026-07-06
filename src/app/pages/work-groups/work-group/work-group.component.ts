import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { WorkGroup } from '../../../shared/models/workgroups.model';

@Component({
  selector: 'tr[app-work-group-row]',
  imports: [MatIconModule, MatTooltipModule, MatCheckboxModule],
  templateUrl: './work-group.component.html',
  styleUrls: ['./work-group.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class WorkGroupRowComponent {
  workGroup = input.required<WorkGroup>();
  selected = input(false);

  showResources = output<WorkGroup>();
  editWorkGroup = output<WorkGroup>();
  assignResourcesToGroups = output<WorkGroup>();

  deleteWorkGroup = output<WorkGroup>();
  isSelected = input<string | null>(null);

}
