import { Component, inject, input, output, ViewEncapsulation } from '@angular/core';
import { AppButtonComponent } from '../../../shared/button/button';
import { Employee } from '../../../shared/models/employee.model';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EntityPermissionsService } from '../../../shared/services/permissions.service';

@Component({
  selector: 'tr[app-employee-row]',
  imports: [MatIconModule, MatTooltipModule],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class EmployeeRowComponent {
  private permissionsService = inject(EntityPermissionsService);

  isCurrentUserGlobalAdmin(): boolean {
      return this.permissionsService.isGlobalAdmin();
  }

  isCurrentUserGlobalManager(): boolean {
      return this.permissionsService.isGlobalManager();
  }
  
  employee = input.required<Employee>();

  viewEmployee = output<Employee>();
  editEmployee = output<Employee>();
  deleteEmployee = output<Employee>();
}
