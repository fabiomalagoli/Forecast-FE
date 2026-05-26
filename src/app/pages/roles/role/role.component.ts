import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { AppButtonComponent } from '../../../shared/button/button';
import { Role } from '../../../shared/models/role.model';

@Component({
  selector: 'tr[app-role-row]',
  imports: [AppButtonComponent],
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
}
