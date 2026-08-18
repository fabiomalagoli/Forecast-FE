import { Component, inject, Injectable, signal } from '@angular/core';
import { forkJoin, Observable, tap } from 'rxjs';
import { LookupsService } from '../../services/lookups.service';
import { CustomersService } from '../../services/customers.service';
import { JobRolesService } from '../../services/job-roles.service';
import { EmployeesService } from '../../services/employees.service';
import { Employee } from '../../models/employee.model';
import { JobRole } from '../../models/job-role.model';
import { Company } from '../../models/company.model';
import { Project } from '../../models/project.model';
import { Customer } from '../../models/customer.model';
import { CommonModule } from '@angular/common';
import { ProjectFormFacade } from '../../utils/project-form.facade';

@Component({
  selector: 'app-modifica-progetto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'AutoCompleteDropdown.component.html',
  providers: []
})
export class AutoCompleteDropdownComponent {
  private facade = inject(ProjectFormFacade);
  pmDropdownOpen = signal(false);
  showAllPmOptions = signal(false);
  pmFilterValue = signal('');

  // filteredPmOptions(): any[] {
  //   const term = this.facade.showAllPmOptions() ? '' : this.facade.pmFilterValue().trim().toLowerCase();
  //   if (!term) return this.facade.employeesList();
  //   return this.facade.employeesList().filter((emp) => this.employeeName(emp).toLowerCase().includes(term));
  // }
}