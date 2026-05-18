import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  buildProjectEmployeePayload,
  buildProjectJobRolePayload,
  buildProjectUpdatePayload,
  normalizeProjectBudgetForForm,
} from '../../../../shared/payloads/project.payloads';
import { TextInputComponent } from '../../../../shared/text-input/text-input.component';
import {
  buildEditableProjectHeaders,
  calculateProjectTotals,
  cloneProjectForEdit,
  createEmptyProjectEmployee,
  createEmptyProjectRole,
  findEquivalentProjectEmployee,
  findProjectItemById,
  formatEuroCurrency,
  getDateAfterDays,
  getExclusiveDaysDiff,
  getRemovedProjectItems,
  getProjectFormComparableSnapshot,
  getProjectEmployeeRequestId,
  getWinProbabilityError,
  hasProjectItemChanged,
  isProjectEmployeeComplete,
  isProjectRoleComplete,
  isTemporaryProjectItem,
  normalizeProjectFormData,
  parseIsoDate,
  toElementId,
} from '../../../../shared/utils/project-form.utils';
import { CustomersService } from '../../../../shared/services/customers.service';
import { EmployeesService } from '../../../../shared/services/employees.service';
import { LookupsService } from '../../../../shared/services/lookups.service';
import { ProjectsService } from '../../../../shared/services/projects.service';
import { RolesService } from '../../../../shared/services/roles.service';
import { ProjectEmployee } from '../../../../shared/models/project.model';
import { ProjectRole } from '../../../../shared/models/project.model';
import { Project } from '../../../../shared/models/project.model';

@Component({
  selector: 'app-modifica-progetto',
  standalone: true,
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './edit-project.component.html',
  styleUrls: ['../../../../shared/form-styles.scss'],
})
export class EditProjectComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  private customersService = inject(CustomersService);
  private rolesService = inject(RolesService);
  private lookupsService = inject(LookupsService);
  private employeesService = inject(EmployeesService);

  companiesList = signal<any[]>([]);
  customersList = signal<any[]>([]);
  projectStatusesList = signal<any[]>([]);
  employeesList = signal<any[]>([]);
  jobRolesList = signal<any[]>([]);
  jobRoleLevelsList = signal<any[]>([]);

  selectedProjectToEdit = input.required<Project>();

  saved = output<Project>();
  cancel = output<void>();

  private originalFormSnapshot = '';
  private originalComparableSnapshot = '';
  private initialFormData: any = null;

  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  dateRangeError = false;

  formData: any = {};

  readonly headers = buildEditableProjectHeaders();

  ngOnInit() {
    this.formData = cloneProjectForEdit(this.selectedProjectToEdit());

    const lookupRequests = {
      companies: this.lookupsService.loadAvailableCompanies(),
      customers: this.customersService.loadAvailableCustomers(),
      statuses: this.lookupsService.loadProjectStatuses(),
      employees: this.employeesService.loadAllEmployees(),
      roles: this.rolesService.loadAllJobRoles(),
      levels: this.rolesService.loadJobRoleLevels(),
    };

    forkJoin(lookupRequests).subscribe((lookups) => {
      this.companiesList.set(lookups.companies);
      this.customersList.set(lookups.customers);
      this.projectStatusesList.set(lookups.statuses);
      this.employeesList.set(lookups.employees);
      this.jobRolesList.set(lookups.roles);
      this.jobRoleLevelsList.set(lookups.levels);

      normalizeProjectFormData(this.formData, lookups);
      normalizeProjectBudgetForForm(this.formData);

      this.saveInitialSnapshot();
    });
  }

  isChanged(): boolean {
    return getProjectFormComparableSnapshot(this.formData) !== this.originalComparableSnapshot;
  }

  isFieldChanged(key: string): boolean {
    if (!this.initialFormData) return false;

    return JSON.stringify(this.formData[key]) !== JSON.stringify(this.initialFormData[key]);
  }

  isRoleFieldChanged(index: number, field: string): boolean {
    const originalRole = this.initialFormData?.projectJobRoles?.[index];
    if (!originalRole) return true;

    return JSON.stringify(this.formData.projectJobRoles[index][field]) !== JSON.stringify(originalRole[field]);
  }

  isSubmitDisabled(form: NgForm): boolean {
    return form.invalid || !this.hasValidRoles() || !this.hasValidResources() || !this.isChanged();
  }

  onSubmitClick(form: NgForm, event: Event) {
    if (!this.isChanged()) {
      event.preventDefault();
      this.noChangesMessage = true;
      return;
    }

    if (form.invalid || !this.hasValidRoles() || !this.hasValidResources()) {
      event.preventDefault();
      this.attemptedSubmit = true;
    }
  }

  onFieldChange() {
    this.noChangesMessage = false;
  }

  recalculateTotals() {
    const roles = this.formData.projectJobRoles || [];
    const employees = this.formData.projectEmployees || [];
    const totals = calculateProjectTotals([...roles, ...employees]);

    this.formData.totalDays = totals.totalDays;
    this.formData.totalBudget = formatEuroCurrency(totals.totalBudget);
  }

  submit(form: NgForm) {
    if (form.invalid || !this.hasValidRoles() || !this.hasValidResources() || !this.isChanged()) return;

    const projectId = this.selectedProjectToEdit().id;
    const calls: any[] = [];

    const originalRoles = this.selectedProjectToEdit().projectJobRoles || [];
    const currentRoles = this.formData.projectJobRoles || [];
    const rolesToRemove = getRemovedProjectItems(originalRoles, currentRoles);

    const originalEmployees = this.selectedProjectToEdit().projectEmployees || [];
    const currentEmployees = this.formData.projectEmployees || [];
    const employeesToRemove = getRemovedProjectItems(originalEmployees, currentEmployees);

    rolesToRemove.forEach((role) => {
      calls.push(this.projectsService.deleteProjectJobRole(projectId, role.id));
    });

    employeesToRemove.forEach((employee) => {
      calls.push(this.projectsService.deleteProjectEmployee(projectId, getProjectEmployeeRequestId(employee)));
    });

    calls.push(this.projectsService.updateProject(this.buildProjectPayload(projectId)));

    currentRoles.forEach((role: any) => {
      const rolePayload = buildProjectJobRolePayload(role);
      const originalRole = findProjectItemById(this.initialFormData?.projectJobRoles || [], role.id);

      if (this.isTemporaryRoleId(role.id)) {
        calls.push(this.projectsService.addProjectJobRole(projectId, [rolePayload]));
      } else if (hasProjectItemChanged(role, originalRole)) {
        calls.push(this.projectsService.updateProjectJobRole(projectId, role.id, rolePayload));
      }
    });

    currentEmployees.forEach((employee: ProjectEmployee) => {
      const employeePayload = buildProjectEmployeePayload(employee);
      const originalEmployee = findProjectItemById(this.initialFormData?.projectEmployees || [], employee.id);

      if (this.isTemporaryEmployeeId(employee.id)) {
        const equivalentOriginalEmployee = findEquivalentProjectEmployee(
          this.initialFormData?.projectEmployees || [],
          employee,
        );

        if (!equivalentOriginalEmployee) {
          calls.push(this.projectsService.addProjectEmployee(projectId, [employeePayload]));
        }
      } else if (hasProjectItemChanged(employee, originalEmployee)) {
        calls.push(
          this.projectsService.updateProjectEmployee(
            projectId,
            getProjectEmployeeRequestId(employee),
            employeePayload,
          ),
        );
      }
    });

    forkJoin(calls).subscribe({
      next: () => {
        this.showNotification('Progetto e ruoli aggiornati con successo!', 'success');
        this.saved.emit(this.formData);
        this.saveInitialSnapshot();
      },
      error: (error) => {
        console.error("Errore durante il salvataggio massivo:", error);
        this.showNotification("Errore durante l'aggiornamento di alcuni dati.", 'error');
      },
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  isNumericField(key: string): boolean {
    return key === 'winProbability' || key === 'totalDays';
  }

  getPattern(key: string): string {
    if (key === 'winProbability') return '^(100|[1-9][0-9]?)$';
    if (this.isNumericField(key)) return '^[0-9]+$';

    return '';
  }

  getOptions(key: string): any[] {
    switch (key) {
      case 'projectStatusId':
        return this.projectStatusesList();
      case 'companyId':
        return this.companiesList();
      case 'customerId':
        return this.customersList();
      case 'pmId':
        return this.employeesList();
      default:
        return [];
    }
  }

  onDateChange() {
    const start = parseIsoDate(this.formData.startDate);
    const end = parseIsoDate(this.formData.endDate);

    if (!start || !end) {
      this.dateRangeError = false;
      this.formData.totalDays = '';
      return;
    }

    if (end < start) {
      this.dateRangeError = true;
      this.formData.totalDays = '';
      return;
    }

    this.dateRangeError = false;
    this.formData.totalDays = getExclusiveDaysDiff(start, end);
  }

  onTotalDaysChange() {
    const start = parseIsoDate(this.formData.startDate);
    const totalDays = Number(this.formData.totalDays);

    if (!start || !Number.isFinite(totalDays) || totalDays <= 0) {
      this.formData.endDate = '';
      return;
    }

    this.dateRangeError = false;
    this.formData.endDate = getDateAfterDays(start, totalDays);
  }

  toId(key: string, index: number): string {
    return toElementId('progetto', key, index);
  }

  addRole() {
    this.formData.projectJobRoles ??= [];
    this.formData.projectJobRoles.push(createEmptyProjectRole());
    this.recalculateTotals();
  }

  addEmployee() {
    this.formData.projectEmployees ??= [];
    this.formData.projectEmployees.push(createEmptyProjectEmployee());
  }

  removeRole(index: number) {
    this.formData.projectJobRoles.splice(index, 1);
    this.recalculateTotals();
  }

  removeEmployee(index: number) {
    this.formData.projectEmployees.splice(index, 1);
    this.recalculateTotals();
  }

  hasValidRoles(): boolean {
    const roles = this.formData.projectJobRoles;
    if (!roles || roles.length === 0) return true;

    return roles.every((role: any) => isProjectRoleComplete(role));
  }

  hasValidResources(): boolean {
    const employees = this.formData.projectEmployees;
    if (!employees || employees.length === 0) return true;

    return employees.every((employee: any) => isProjectEmployeeComplete(employee));
  }

  getWinProbabilityError(item: any) {
    return getWinProbabilityError(item);
  }

  private buildProjectPayload(projectId: string): any {
    const selectedCompany = this.companiesList().find((company) => company.id === this.formData.companyId)?.name;
    const selectedCustomer = this.customersList().find((customer) => customer.id === this.formData.customerId)?.name;
    const selectedStatus = this.projectStatusesList().find(
      (status) => status.id === this.formData.projectStatusId,
    )?.name;
    const selectedPm = this.employeesList().find((employee) => employee.id === this.formData.pmId);

    return buildProjectUpdatePayload(this.formData, projectId, {
      company: selectedCompany,
      customer: selectedCustomer,
      projectStatus: selectedStatus,
      pm: selectedPm ? `${selectedPm.name} ${selectedPm.surname}` : this.formData.pm,
    });
  }

  private isTemporaryRoleId(id: string): boolean {
    return isTemporaryProjectItem(id, this.selectedProjectToEdit().projectJobRoles as ProjectRole[]);
  }

  private isTemporaryEmployeeId(id: string): boolean {
    return isTemporaryProjectItem(id, this.selectedProjectToEdit().projectEmployees as ProjectEmployee[]);
  }

  private saveInitialSnapshot() {
    this.originalFormSnapshot = JSON.stringify(this.formData);
    this.originalComparableSnapshot = getProjectFormComparableSnapshot(this.formData);
    this.initialFormData = JSON.parse(this.originalFormSnapshot);
  }

  private showNotification(text: string, type: 'success' | 'error') {
    this.statusMessage = { text, type };
    setTimeout(() => {
      this.statusMessage = null;
    }, 3000);
  }
}
