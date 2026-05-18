import { Component, input, output } from '@angular/core';
import { AppButtonComponent } from '../../../shared/button/button';
import { Employee } from '../../../shared/models/employee.model';

@Component({
  selector: 'tr[app-employee-row]',
  imports: [AppButtonComponent],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.scss',
})
export class EmployeeRowComponent {
  employee = input.required<Employee>();

  viewEmployee = output<Employee>();
  editEmployee = output<Employee>();
}
