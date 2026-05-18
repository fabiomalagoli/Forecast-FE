import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  buildProjectEmployeePayload,
  buildProjectJobRolePayload,
} from '../../../shared/payloads/project.payloads';
import { CustomersService } from '../../../shared/services/customers.service';
import { EmployeesService } from '../../../shared/services/employees.service';
import { LookupsService } from '../../../shared/services/lookups.service';
import { ProjectsService } from '../../../shared/services/projects.service';
import { RolesService } from '../../../shared/services/roles.service';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import {
  buildEditableProjectHeaders,
  calculateProjectTotals,
  createEmptyProjectEmployee,
  createEmptyProjectFormData,
  createEmptyProjectRole,
  formatEuroCurrency,
  getDateAfterDays,
  getExclusiveDaysDiff,
  getTodayIsoDate,
  getWinProbabilityError,
  isProjectEmployeeComplete,
  isProjectRoleComplete,
  parseIsoDate,
  toElementId,
} from '../../../shared/utils/project-form.utils';
import { Project } from '../../../shared/models/project.model';

@Component({
  selector: 'app-new-progetto',
  standalone: true,
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './new-project.component.html',
  styleUrls: ['../../../shared/form-styles.scss'],
})
export class NewProgettoComponent implements OnInit {
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

  created = output<Project>();
  cancel = output<void>();

  private originalFormSnapshot = '';
  private initialFormData: any = null;

  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  dateRangeError = false;

  formData: any = {
    projectStatus: 'Initiation',
    startDate: getTodayIsoDate(),
  };

  readonly headers = buildEditableProjectHeaders();

  ngOnInit() {
    const lookupRequests = {
      companies: this.lookupsService.loadAvailableCompanies(),
      customers: this.customersService.loadAvailableCustomers(),
      statuses: this.lookupsService.loadProjectStatuses(),
      roles: this.rolesService.loadAllJobRoles(),
      levels: this.rolesService.loadJobRoleLevels(),
      employees: this.employeesService.loadAllEmployees(),
    };

    forkJoin(lookupRequests).subscribe((lookups) => {
      this.companiesList.set(lookups.companies);
      this.customersList.set(lookups.customers);
      this.projectStatusesList.set(lookups.statuses);
      this.employeesList.set(lookups.employees);
      this.jobRolesList.set(lookups.roles);
      this.jobRoleLevelsList.set(lookups.levels);

      const defaultStatusId = lookups.statuses.find((status) => status.name === 'Initiation')?.id || null;
      this.formData = createEmptyProjectFormData(defaultStatusId);
      this.saveInitialSnapshot();
    });
  }

  submit(form: NgForm) {
    if (this.isSubmitDisabled(form)) return;

    const projectPayload = {
      ...this.formData,
      totalBudget: Number(this.formData.totalBudget),
    };

    this.projectsService.addProject(projectPayload).subscribe({
      next: (createdProject: any) => {
        const newProjectId = createdProject.id;
        const detailRequests: any[] = [];

        this.formData.projectJobRoles.forEach((role: any) => {
          detailRequests.push(this.projectsService.addProjectJobRole(newProjectId, [buildProjectJobRolePayload(role)]));
        });

        this.formData.projectEmployees.forEach((employee: any) => {
          detailRequests.push(this.projectsService.addProjectEmployee(newProjectId, [buildProjectEmployeePayload(employee)]));
        });

        if (!detailRequests.length) {
          this.created.emit(createdProject);
          return;
        }

        forkJoin(detailRequests).subscribe({
          next: () => {
            this.showNotification('Progetto creato con successo con tutti i dettagli!', 'success');
            this.created.emit(createdProject);
          },
          error: () => this.showNotification('Progetto creato, ma errore nel salvataggio di ruoli/risorse.', 'error'),
        });
      },
      error: () => this.showNotification('Errore nella creazione del progetto.', 'error'),
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  isNumericField(key: string): boolean {
    return key === 'winProbability' || key === 'totalDays' || key === 'totalBudget';
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

  isFieldChanged(key: string): boolean {
    if (!this.initialFormData) return false;

    return JSON.stringify(this.formData[key]) !== JSON.stringify(this.initialFormData[key]);
  }

  getPattern(key: string): string {
    if (key === 'winProbability') return '^(100|[1-9][0-9]?)$';
    if (key === 'totalBudget') {
      return '^\\s*(?:\\u20AC\\s*)?(?:\\d{1,3}(?:[.,]\\d{3})*|\\d+)(?:[.,]\\d{1,2})?\\s*(?:\\u20AC\\s*)?$';
    }
    if (this.isNumericField(key)) return '^[0-9]+$';

    return '';
  }

  onFieldChange() {
    this.noChangesMessage = false;
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

  recalculateTotals() {
    const roles = this.formData.projectJobRoles || [];
    const employees = this.formData.projectEmployees || [];
    const totals = calculateProjectTotals([...roles, ...employees]);

    this.formData.totalDays = totals.totalDays;
    this.formData.totalBudget = formatEuroCurrency(totals.totalBudget);
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

  isChanged(): boolean {
    return JSON.stringify(this.formData) !== this.originalFormSnapshot;
  }

  isSubmitDisabled(form: NgForm): boolean {
    return form.invalid || !this.hasValidRoles() || !this.hasValidResources();
  }

  onSubmitClick(form: NgForm, event: Event) {
    if (this.isSubmitDisabled(form)) {
      event.preventDefault();
      this.attemptedSubmit = true;
    }
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

  private saveInitialSnapshot() {
    this.originalFormSnapshot = JSON.stringify(this.formData);
    this.initialFormData = JSON.parse(this.originalFormSnapshot);
  }

  private showNotification(text: string, type: 'success' | 'error') {
    this.statusMessage = { text, type };
    setTimeout(() => {
      this.statusMessage = null;
    }, 3000);
  }
}
