import { Component, input, output } from '@angular/core';
import { AppButton } from '../../shared/button/button';
import { Role } from '../role.model';

@Component({
  selector: 'tr[app-role-row]',
  imports: [AppButton],
  templateUrl: './role.html',
  styleUrl: './role.css',
})
export class RoleRowComponent {
  role = input.required<Role>();
  selected = input(false);

  showResources = output<Role>();
  editRole = output<Role>();
}
