import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, output, signal, effect, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { buildEmployeePayload, buildEmployeeUiFallback } from '../../../shared/payloads/employee.payloads';
import { Employee } from '../../../shared/models/employee.model';
import { AssignSingleComponent } from '../project/assign-single/assign-single.component';
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
  getProjectFieldPattern,
  getProjectFormComparableSnapshot
} from '../../../shared/utils/project-form.utils';

@Component({
  selector: 'app-new-progetto',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TextInputComponent, AssignSingleComponent],
  templateUrl: './new-project.component.html',
})
export class NewProgettoComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  private customersService = inject(CustomersService);
  private rolesService = inject(RolesService);
  private lookupsService = inject(LookupsService);
  private employeesService = inject(EmployeesService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  private pendingEmployeeAssignments = new Map<string, Employee>();
  hasMadeInlineAssignment = signal(false);
  activeAssignIndex = signal<number | null>(null);
  assignSelectedEmployeeId = signal<string | null>(null);

  companiesList = signal<any[]>([]);
  customersList = signal<any[]>([]);
  projectStatusesList = signal<any[]>([]);
  employeesList = signal<any[]>([]);
  jobRolesList = signal<any[]>([]);
  jobRoleLevelsList = signal<any[]>([]);
  pmDropdownOpen = signal(false);
  showAllPmOptions = signal(false);
  pmFilterValue = signal('');

  created = output<Project>();
  isSaving = signal(false);
  cancel = output<void>();

  newProjectForm!: FormGroup;
  private originalFormSnapshot = '';
  
  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  dateRangeError = false;

  readonly headers = buildEditableProjectHeaders();
  readonly getPattern = getProjectFieldPattern;

  isButtonDisabled = signal(true);

  constructor() {
    this.initForm();
    this.setupEmployeesEffect();
  }

  private setupEmployeesEffect() {
    effect(() => {
      const _ = this.employeesList();
      this.recomputeUnassignedFlag();
    });
  }

  initForm() {
    const formControls: { [key: string]: any } = {};

    this.headers.forEach(header => {
      const initialValue = header.key === 'startDate' ? getTodayIsoDate() : '';
      if (['name', 'companyId', 'customerId', 'pmId', 'winProbability'].includes(header.key)) {
        formControls[header.key] = [initialValue, Validators.required];
      } else {
        formControls[header.key] = [initialValue];
      }
    });

    formControls['projectJobRoles'] = this.fb.array([]);
    formControls['projectEmployees'] = this.fb.array([]);

    this.newProjectForm = this.fb.group(formControls);
  }

  checkButtonState() {
    const disabled = this.isSaving() || 
                     this.dateRangeError || 
                     this.resourceDaysExceeded ||
                     this.newProjectForm.invalid || 
                     !this.hasValidRoles() || 
                     !this.hasValidResources() || 
                     !this.isChanged();
                     
    this.isButtonDisabled.set(disabled);
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

        const defaultStatusId = lookups.statuses.find((status) => status.name === 'Initiation')?.id || null;
        this.newProjectForm.patchValue({ projectStatusId: defaultStatusId }, { emitEvent: false });

        this.setupReactiveCalculations();        
        this.originalFormSnapshot = getProjectFormComparableSnapshot(this.newProjectForm.getRawValue());

        this.checkButtonState()
        this.cdr.detectChanges();
    });  
  }

  isEmployeeUnassigned(employeeId: string): boolean {
    if (!employeeId) return false;
    const emp = this.employeesList().find(e => String(e.id) === String(employeeId));
    return emp ? (emp.jobRole || '').toString().toLowerCase() === 'unassigned' : false;
  }

  closeAssignPanel() {
    this.activeAssignIndex.set(null);
  }

  onAssignSaved(updated: Employee[]) {
    this.activeAssignIndex.set(null);
    
    if (updated && updated.length > 0) {
      const updatedEmp = updated[0];
      const resolvedRoleId = this.resolveLookupId(this.jobRolesList(), updatedEmp.jobRole);
      const resolvedLevelId = this.resolveLookupId(this.jobRoleLevelsList(), updatedEmp.jobRoleLevel);
      const controls = this.projectEmployees.controls;
      
      this.pendingEmployeeAssignments.set(String(updatedEmp.id), updatedEmp);
      this.employeesList.update((employees) =>
        employees.map((employee) => String(employee.id) === String(updatedEmp.id) ? updatedEmp : employee)
      );

      for (let i = 0; i < controls.length; i++) {
        const ctrl = controls[i];
        const ctrlId = ctrl.get('employeeId')?.value || ctrl.get('id')?.value;
        
        if (String(ctrlId) === String(updatedEmp.id)) {
          ctrl.patchValue({
            jobRole: resolvedRoleId,
            jobRoleLevel: resolvedLevelId,
          });
          ctrl.markAsDirty();
          break;
        }
      }

      this.hasMadeInlineAssignment.set(true); 
      this.newProjectForm.markAsDirty();
      this.cdr.markForCheck();
    }
  }

  recomputeUnassignedFlag() {
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
        this.newProjectForm.patchValue({ endDate: newEndDate }, { emitEvent: false });
      }
    });

    this.projectJobRoles.valueChanges.subscribe(() => this.recalculateTotals());
    this.projectEmployees.valueChanges.subscribe(() => this.recalculateTotals());

    this.newProjectForm.valueChanges.subscribe(() => {
      this.checkButtonState();
    });
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
    const roles = this.projectJobRoles.getRawValue() || [];
    const employees = this.projectEmployees.getRawValue() || [];
    const totals = calculateProjectTotals([...roles, ...employees]);

    this.newProjectForm.patchValue({
      totalBudget: formatEuroCurrency(totals.totalBudget)
    }, { emitEvent: false });
  }

  get resourceDaysExceeded(): boolean {
    const projectDays = Number(this.newProjectForm.get('totalDays')?.value || 0);
    const roles = this.projectJobRoles.getRawValue() || [];
    const employees = this.projectEmployees.getRawValue() || [];
    
    const totalAllocatedDays = roles.reduce((sum: number, r: any) => sum + Number(r.daysSpent || 0), 0) +
                               employees.reduce((sum: number, e: any) => sum + Number(e.daysSpent || 0), 0);
    
    return totalAllocatedDays > projectDays;
  }

  isSubmitDisabled(): boolean {
    return this.isSaving() || 
           this.dateRangeError || 
           this.resourceDaysExceeded ||
           this.newProjectForm.invalid || 
           !this.hasValidRoles() || 
           !this.hasValidResources() || 
           !this.isChanged();
  }

  get projectJobRoles(): FormArray {
    return this.newProjectForm.get('projectJobRoles') as FormArray;
  }

  get projectEmployees(): FormArray {
    return this.newProjectForm.get('projectEmployees') as FormArray;
  }

  addRole() {
    this.projectJobRoles.push(this.fb.group(createEmptyProjectRole()));
  }

  addEmployee() {
    this.projectEmployees.push(this.fb.group(createEmptyProjectEmployee()));
  }

  removeRole(index: number) {
    this.projectJobRoles.removeAt(index);
  }

  removeEmployee(index: number) {
    this.projectEmployees.removeAt(index);
  }

  isChanged(): boolean {
    if (this.hasMadeInlineAssignment()) return true;
    const currentFormValue = this.newProjectForm.getRawValue();
    return getProjectFormComparableSnapshot(currentFormValue) !== this.originalFormSnapshot;
  }

  hasValidRoles(): boolean {
    const roles = this.projectJobRoles.getRawValue();
    if (!roles || roles.length === 0) return true;
    return roles.every((role: any) => isProjectRoleComplete(role) && !this.getWinProbabilityError(role));
  }

  hasValidResources(): boolean {
    const employees = this.projectEmployees.getRawValue();
    if (!employees || employees.length === 0) return true;
    return employees.every((employee: any) => isProjectEmployeeComplete(employee) && !this.getWinProbabilityError(employee));
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

    this.isSaving.set(true);

    const formValue = this.newProjectForm.getRawValue();
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

        this.pendingEmployeeAssignments.forEach((employee) => {
          detailRequests.push(this.buildPendingEmployeeAssignmentCall(employee));
        });

        if (!detailRequests.length) {
          this.finalizeSubmit(createdProject);
          return;
        }

        forkJoin(detailRequests).subscribe({
          next: () => {
            this.showNotification('Progetto creato con successo!', 'success');
            this.finalizeSubmit(createdProject);
          },
          error: () => {
            this.showNotification('Progetto creato, ma errore nel salvataggio di ruoli/risorse.', 'error');
            this.isSaving.set(false);
          },
        });
      },
      error: () => {
        this.showNotification('Errore nella creazione del progetto.', 'error');
        this.isSaving.set(false);
      },
    });
  }

  private finalizeSubmit(createdProject: Project) {
    this.isSaving.set(false);
    this.hasMadeInlineAssignment.set(false);
    this.pendingEmployeeAssignments.clear();
    this.created.emit(createdProject);
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

  onWinProbabilityBlur(control: any) {
    const val = control?.value;
    if (!val) return;

    const normalized = String(val).replace(',', '.');
    const num = parseFloat(normalized);

    if (!isNaN(num) && num >= 1 && num <= 100) {
      // Imposta il valore a 2 cifre decimali fisse
      control.setValue(num.toFixed(2), { emitEvent: true });
    }
    this.onFieldChange();
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

  employeeName(employee: any): string {
    return `${employee?.name || employee?.Name || ''} ${employee?.surname || employee?.Surname || ''}`.trim();
  }

  pmInputValue(): string {
    if (this.pmDropdownOpen() && !this.showAllPmOptions()) {
      return this.pmFilterValue();
    }

    const pmId = this.newProjectForm.get('pmId')?.value;
    return this.employeeName(this.employeesList().find((employee) => (employee.id || employee.Id) === pmId));
  }

  filteredPmOptions(): any[] {
    const term = this.showAllPmOptions() ? '' : this.pmFilterValue().trim().toLowerCase();

    if (!term) {
      return this.employeesList();
    }

    return this.employeesList().filter((employee) => this.employeeName(employee).toLowerCase().includes(term));
  }

  onPmFocus() {
    this.showAllPmOptions.set(true);
    this.pmDropdownOpen.set(true);
  }

  onPmInput(event: Event) {
    this.pmFilterValue.set((event.target as HTMLInputElement).value);
    this.showAllPmOptions.set(false);
    this.pmDropdownOpen.set(true);
  }

  togglePmDropdown() {
    this.showAllPmOptions.set(true);
    this.pmDropdownOpen.update((open) => !open);
  }

  selectPm(employee: any | null) {
    this.newProjectForm.get('pmId')?.setValue(employee ? (employee.id || employee.Id) : null);
    this.pmFilterValue.set('');
    this.pmDropdownOpen.set(false);
    this.showAllPmOptions.set(false);
    this.onFieldChange();
  }

  clearPm() {
    this.selectPm(null);
  }

  toId(key: string, index: number): string {
    return toElementId('progetto', key, index);
  }

  getWinProbabilityError(item: any) {
    return getWinProbabilityError(item);
  }

  private buildPendingEmployeeAssignmentCall(employee: Employee) {
    const roleId = this.resolveLookupId(this.jobRolesList(), employee.jobRole);
    const roleName = roleId
      ? (this.jobRolesList().find((role) => String(role.id) === String(roleId))?.name || employee.jobRole)
      : employee.jobRole;

    const payload = buildEmployeePayload(employee, {
      selectedRoleId: roleId,
      levels: this.jobRoleLevelsList(),
      companies: this.companiesList(),
    });
    const uiFallback = buildEmployeeUiFallback({ ...employee, jobRole: roleName }, employee.id);

    return this.employeesService.updateEmployee(employee.id, payload, uiFallback);
  }

  private resolveLookupId(options: any[], value: string | null | undefined): string | null {
    if (!value) return null;

    const valueAsString = String(value);
    const normalizedValue = valueAsString.trim().toLowerCase();
    const match = options.find((option) =>
      String(option.id || option.Id) === valueAsString ||
      String(option.name || option.Name || '').trim().toLowerCase() === normalizedValue
    );

    return match ? (match.id || match.Id) : valueAsString;
  }

  private showNotification(text: string, type: 'success' | 'error') {
    this.statusMessage = { text, type };
    timer(3000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.statusMessage = null;
    });
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent) {
    const target = event.target as Element | null;

    if (!target?.closest('.pm-combo-field')) {
      this.pmDropdownOpen.set(false);
      this.showAllPmOptions.set(false);
      this.pmFilterValue.set('');
    }
  }
}