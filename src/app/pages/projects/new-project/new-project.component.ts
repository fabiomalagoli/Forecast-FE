import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Project } from '../../../shared/models/project.model';
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

@Component({
  selector: 'app-new-progetto',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TextInputComponent], // Rimosso FormsModule, inserito ReactiveFormsModule
  templateUrl: './new-project.component.html',
  styleUrls: ['../../../shared/form-styles.scss'],
})
export class NewProgettoComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  private customersService = inject(CustomersService);
  private rolesService = inject(RolesService);
  private lookupsService = inject(LookupsService);
  private employeesService = inject(EmployeesService);
  private fb = inject(FormBuilder);

  companiesList = signal<any[]>([]);
  customersList = signal<any[]>([]);
  projectStatusesList = signal<any[]>([]);
  employeesList = signal<any[]>([]);
  jobRolesList = signal<any[]>([]);
  jobRoleLevelsList = signal<any[]>([]);

  created = output<Project>();
  cancel = output<void>();

  newProjectForm!: FormGroup;
  private originalFormSnapshot = '';

  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  dateRangeError = false;

  readonly headers = buildEditableProjectHeaders();

  constructor() {
    this.initForm();
  }

  initForm() {
    const formControls: { [key: string]: any } = {};

    this.headers.forEach(header => {
      const initialValue = header.key === 'startDate' ? getTodayIsoDate() : '';
      formControls[header.key] = [initialValue];
    });

    // Inizializziamo i FormArray vuoti per ruoli e dipendenti
    formControls['projectJobRoles'] = this.fb.array([]);
    formControls['projectEmployees'] = this.fb.array([]);

    this.newProjectForm = this.fb.group(formControls);

    // Attiviamo i ricalcoli reattivi in background
    this.setupReactiveCalculations();
  }

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

      // Impostiamo i valori di default appena arrivano i lookups
      const defaultStatusId = lookups.statuses.find((status) => status.name === 'Initiation')?.id || null;
      this.newProjectForm.patchValue({ projectStatus: defaultStatusId });
      
      // Salviamo lo stato iniziale
      this.originalFormSnapshot = JSON.stringify(this.newProjectForm.getRawValue());
    });
  }

  private setupReactiveCalculations() {
    this.newProjectForm.get('startDate')?.valueChanges.subscribe(() => this.recalculateDateRange());
    this.newProjectForm.get('endDate')?.valueChanges.subscribe(() => this.recalculateDateRange());

    this.newProjectForm.get('totalDays')?.valueChanges.subscribe((days) => {
      const start = parseIsoDate(this.newProjectForm.get('startDate')?.value);
      const totalDays = Number(days);

      if (start && Number.isFinite(totalDays) && totalDays > 0) {
        this.dateRangeError = false;
        const newEndDate = getDateAfterDays(start, totalDays);
        // {emitEvent: false} evita loop infiniti con il ricalcolo delle date
        this.newProjectForm.patchValue({ endDate: newEndDate }, { emitEvent: false });
      }
    });

    // Ascoltiamo modifiche agli array per ricalcolare i totali globali
    this.projectJobRoles.valueChanges.subscribe(() => this.recalculateTotals());
    this.projectEmployees.valueChanges.subscribe(() => this.recalculateTotals());
  }

  private recalculateDateRange() {
    const start = parseIsoDate(this.newProjectForm.get('startDate')?.value);
    const end = parseIsoDate(this.newProjectForm.get('endDate')?.value);

    if (!start || !end) {
      this.dateRangeError = false;
      return;
    }
    if (end < start) {
      this.dateRangeError = true;
      return;
    }
    this.dateRangeError = false;
    const diff = getExclusiveDaysDiff(start, end);
    this.newProjectForm.patchValue({ totalDays: diff }, { emitEvent: false });
  }

  private recalculateTotals() {
    // Calcoliamo il totale del budget prendendo dai JSON dei ProjectRoles e ProjectEmployees i Budget relativi 
    const roles = this.projectJobRoles.getRawValue() || [];
    const employees = this.projectEmployees.getRawValue() || [];
    const totals = calculateProjectTotals([...roles, ...employees]);

    this.newProjectForm.patchValue({
      totalDays: totals.totalDays,
      totalBudget: formatEuroCurrency(totals.totalBudget)
    }, { emitEvent: false });
  }

  get projectJobRoles(): FormArray {
    return this.newProjectForm.get('projectJobRoles') as FormArray;
  }

  get projectEmployees(): FormArray {
    return this.newProjectForm.get('projectEmployees') as FormArray;
  }

  addRole() {
    const roleGroup = this.fb.group(createEmptyProjectRole());
    this.projectJobRoles.push(roleGroup);
  }

  addEmployee() {
    const employeeGroup = this.fb.group(createEmptyProjectEmployee());
    this.projectEmployees.push(employeeGroup);
  }

  removeRole(index: number) {
    this.projectJobRoles.removeAt(index);
  }

  removeEmployee(index: number) {
    this.projectEmployees.removeAt(index);
  }

  isChanged(): boolean {
    return JSON.stringify(this.newProjectForm.getRawValue()) !== this.originalFormSnapshot;
  }

  hasValidRoles(): boolean {
    const roles = this.projectJobRoles.getRawValue();
    if (!roles || roles.length === 0) return true;
    return roles.every((role: any) => isProjectRoleComplete(role));
  }

  hasValidResources(): boolean {
    const employees = this.projectEmployees.getRawValue();
    if (!employees || employees.length === 0) return true;
    return employees.every((employee: any) => isProjectEmployeeComplete(employee));
  }

  isSubmitDisabled(): boolean {
    return this.newProjectForm.invalid || !this.hasValidRoles() || !this.hasValidResources() || !this.isChanged();
  }

  onSubmitClick(event: Event) {
    if (this.isSubmitDisabled()) {
      event.preventDefault();
      this.attemptedSubmit = true;
      if (!this.isChanged()) {
        this.noChangesMessage = true;
      }
    }
  }

  submit() {
    if (this.isSubmitDisabled()) return;

    const formValue = this.newProjectForm.getRawValue();

    // Ricalcoliamo il budget pulito perché 'formatEuroCurrency' produce una stringa (es. "1.000 €"), che diventerebbe NaN se inserita in formato Number()
    const rawTotals = calculateProjectTotals([...formValue.projectJobRoles, ...formValue.projectEmployees]);

    const projectPayload = {
      ...formValue,
      totalBudget: rawTotals.totalBudget,
    };

    this.projectsService.addProject(projectPayload).subscribe({
      next: (createdProject: any) => {
        const newProjectId = createdProject.id;
        const detailRequests: any[] = [];

        formValue.projectJobRoles.forEach((role: any) => {
          detailRequests.push(this.projectsService.addProjectJobRole(newProjectId, [buildProjectJobRolePayload(role)]));
        });

        formValue.projectEmployees.forEach((employee: any) => {
          detailRequests.push(this.projectsService.addProjectEmployee(newProjectId, [buildProjectEmployeePayload(employee)]));
        });

        if (!detailRequests.length) {
          this.created.emit(createdProject);
          return;
        }

        forkJoin(detailRequests).subscribe({
          next: () => {
            this.showNotification('Progetto creato con successo!', 'success');
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

  onFieldChange() {
    this.noChangesMessage = false;
    this.attemptedSubmit = false;
  }

  isNumericField(key: string): boolean {
    return key === 'winProbability' || key === 'totalDays' || key === 'totalBudget';
  }

  getPattern(key: string): string {
    if (key === 'winProbability') return '^(100|[1-9][0-9]?)$';
    if (key === 'totalBudget') {
      return '^\\s*(?:\\u20AC\\s*)?(?:\\d{1,3}(?:[.,]\\d{3})*|\\d+)(?:[.,]\\d{1,2})?\\s*(?:\\u20AC\\s*)?$';
    }
    if (this.isNumericField(key)) return '^[0-9]+$';
    return '';
  }

  getOptions(key: string): any[] {
    switch (key) {
      case 'projectStatusId': return this.projectStatusesList();
      case 'companyId': return this.companiesList();
      case 'customerId': return this.customersList();
      case 'pmId': return this.employeesList();
      default: return [];
    }
  }

  toId(key: string, index: number): string {
    return toElementId('progetto', key, index);
  }

  getWinProbabilityError(item: any) {
    return getWinProbabilityError(item);
  }

  private showNotification(text: string, type: 'success' | 'error') {
    this.statusMessage = { text, type };
    setTimeout(() => {
      this.statusMessage = null;
    }, 3000);
  }
}