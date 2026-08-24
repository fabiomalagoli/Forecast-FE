import { Component, computed, inject, input, output, ViewEncapsulation } from '@angular/core';
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { WorkGroup } from '../../../shared/models/workgroup.model';
import { EntityPermissionsService } from '../../../shared/services/permissions.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tr[app-work-group-row]',
  imports: [MatIconModule, MatTooltipModule, MatCheckboxModule, RouterLink],
  templateUrl: './work-group.component.html',
  styleUrls: ['./work-group.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class WorkGroupRowComponent {
  private permissionsService = inject(EntityPermissionsService);

  canManage(workgroup: WorkGroup): boolean {
    return this.permissionsService.canManageMembers(workgroup);
  }

  canDelete(workgroup: WorkGroup): boolean {
    return this.permissionsService.canDelete(workgroup);
  }


  workGroup = input.required<WorkGroup>();
  selected = input(false);

  showResources = output<WorkGroup>();
  editWorkGroup = output<WorkGroup>();
  assignResourcesToGroups = output<WorkGroup>();

  manageUsers = output<WorkGroup>();

  deleteWorkGroup = output<WorkGroup>();
  isSelected = input<string | null>(null);

}
