import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { Role } from '../../../shared/models/role.model';
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'tr[app-role-row]',
  imports: [MatIconModule, MatTooltipModule, MatCheckboxModule],
  templateUrl: './role.component.html',
  styleUrls: ['./role.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RoleRowComponent {
  role = input.required<Role>();
  selected = input(false);

  showResources = output<Role>();
  editRole = output<Role>();
  assignResourcesToRoles = output<Role>();

  deleteRole = output<Role>();
  isSelected = input<string | null>(null);
}
