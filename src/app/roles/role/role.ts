import { Component, input, output } from '@angular/core';
import { AppButtonComponent } from '../../shared/button/button';
import { Role } from '../role.model';
import { ModificaRoleComponent } from '../modifica-role/modifica-role';

@Component({
  selector: 'tr[app-role-row]',
  imports: [AppButtonComponent],
  templateUrl: './role.html',
  styleUrls: ['./role.css'],
})
export class RoleRowComponent {
  role = input.required<Role>();
  selected = input(false);

  showResources = output<Role>();
  editRole = output<Role>();
}
