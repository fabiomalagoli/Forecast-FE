import { Component, inject, input, output, ViewEncapsulation } from '@angular/core';
import { JobRole } from '../../../shared/models/job-role.model';
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { EntityPermissionsService } from '../../../shared/services/permissions.service';

@Component({
  selector: 'tr[app-role-row]',
  imports: [MatIconModule, MatTooltipModule, MatCheckboxModule],
  templateUrl: './job-role.component.html',
  styleUrls: ['./job-role.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class JobRoleRowComponent {

  private permissionsService = inject(EntityPermissionsService);

  isCurrentUserGlobalAdmin(): boolean {
      return this.permissionsService.isGlobalAdmin();
  }

  isCurrentUserGlobalManager(): boolean {
      return this.permissionsService.isGlobalManager();
  }

  role = input.required<JobRole>();
  selected = input(false);

  showResources = output<JobRole>();
  editRole = output<JobRole>();
  assignResourcesToRoles = output<JobRole>();

  deleteRole = output<JobRole>();
  isSelected = input<string | null>(null);

  isUnassignedRole(): boolean {
    return this.role().name.trim().toLowerCase() === 'unassigned';
  }
}
