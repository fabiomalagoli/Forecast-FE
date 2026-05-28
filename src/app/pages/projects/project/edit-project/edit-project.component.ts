import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, input, output, signal, ChangeDetectorRef, effect, DestroyRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Project, ProjectEmployee, ProjectRole } from '../../../../shared/models/project.model';
import {
  buildProjectEmployeePayload,
  buildProjectJobRolePayload,
  buildProjectUpdatePayload,
  normalizeProjectBudgetForForm,
} from '../../../../shared/payloads/project.payloads';
import { TextInputComponent } from '../../../../shared/text-input/text-input.component';
import { buildEmployeePayload, buildEmployeeUiFallback } from '../../../../shared/payloads/employee.payloads';
import { Role } from '../../../../shared/models/role.model';
import { Employee } from '../../../../shared/models/employee.model';
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
  getProjectEmployeeRequestId,
  getProjectFormComparableSnapshot,
  getRemovedProjectItems,
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
import { AssignSingleComponent } from '../assign-single/assign-single.component';
import { Company } from '../../../../shared/models/company.model';

@Component({
  selector: 'app-modifica-progetto',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TextInputComponent, AssignSingleComponent], // Sostituito FormsModule con ReactiveFormsModule
  templateUrl: './edit-project.component.html',
})
export class EditProjectComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  private customersService = inject(CustomersService);
  private rolesService = inject(RolesService);
  private lookupsService = inject(LookupsService);
  private employeesService = inject(EmployeesService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  showAssignPanel = signal(false);
  assignRole = signal<Role | null>(null);
  assignList = signal<Employee[]>([]);
  assignSelectedEmployeeId = signal<string | null>(null);
  assignSelectedRoleId = signal<string | null>(null);
  assignSelectedLevel = signal<string | null>(null);
  hasUnassignedInProject = signal(false);

  companiesList = signal<any[]>([]);
  customersList = signal<any[]>([]);
  projectStatusesList = signal<any[]>([]);
  employeesList = signal<any[]>([]);
  jobRolesList = signal<any[]>([]);
  jobRoleLevelsList = signal<any[]>([]);
  pmDropdownOpen = signal(false);
  showAllPmOptions = signal(false);
  pmFilterValue = signal('');

  selectedProjectToEdit = input.required<Project>();
  hasMadeInlineAssignment = signal(false);

  saved = output<Project>();
  isSaving = signal(false);
  cancel = output<void>();

  editProjectForm!: FormGroup;

  private originalComparableSnapshot = '';
  private initialFormData: any = null;

  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  dateRangeError = false;

  activeAssignIndex = signal<number | null>(null);

  readonly headers = buildEditableProjectHeaders();

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

    this.headers.forEach(h => {
      formControls[h.key] = [''];
    });

    formControls['projectJobRoles'] = this.fb.array([]);
    formControls['projectEmployees'] = this.fb.array([]);

    this.editProjectForm = this.fb.group(formControls);
  }

  ngOnInit() {
    // Cloniamo i dati base del progetto
    const clonedProject = cloneProjectForEdit(this.selectedProjectToEdit());

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

        // Normalizziamo i dati (ID ecc.) grazie ai lookups
        normalizeProjectFormData(clonedProject, lookups);
        normalizeProjectBudgetForForm(clonedProject);

        // Salviamo una copia pura per i controlli successivi
        this.initialFormData = JSON.parse(JSON.stringify(clonedProject));

        // Popoliamo il form
        this.populateForm(clonedProject);

        // Attiviamo i ricalcoli reattivi solo dopo aver popolato il form
        this.setupReactiveCalculations();
        this.saveInitialSnapshot();
        this.recomputeUnassignedFlag();
      });
  }

  openAssignPanel() {
    console.log('[EditProject] openAssignPanel called');
    const allRoles = this.jobRolesList() || [];
    const foundUnassigned = allRoles.find(r => (r?.name || '').toString().trim().toLowerCase() === 'unassigned');
    const roleForPanel: Role = foundUnassigned ? foundUnassigned : { id: 'UNASSIGNED-FALLBACK', name: 'Unassigned', isDefault: false } as any;

    const projectEmps = this.projectEmployees.getRawValue() || [];
    const projectEmpIds = projectEmps.map((pe: any) => (pe.employeeId || pe.id) && String(pe.employeeId || pe.id)).filter(Boolean);
    const allEmps = this.employeesList() || [];
    const assignedUnassignedInProject = allEmps.filter(e => projectEmpIds.includes(String(e.id)) && ((e.jobRole || '').toString().toLowerCase() === 'unassigned' || (e.jobRole || '').toString().toLowerCase() === 'unassigned'));

    this.assignRole.set(roleForPanel);
    this.assignList.set(assignedUnassignedInProject);
    this.assignSelectedEmployeeId.set(null);
    this.assignSelectedRoleId.set(null);
    this.assignSelectedLevel.set(null);
    this.showAssignPanel.set(true);
  }

  chooseAssignEmployee(id: string | null) {
    this.assignSelectedEmployeeId.set(id);
    if (!id) return;
    const e = (this.employeesList() || []).find(x => String(x.id) === String(id));
    if (e) {
      this.assignSelectedLevel.set(e.jobRoleLevel || null);
      this.assignSelectedRoleId.set(e.jobRole || null);
    }
  }

  saveAssignSingle() {
    const empId = this.assignSelectedEmployeeId();
    if (!empId) return;
    const emp = (this.employeesList() || []).find(x => String(x.id) === String(empId));
    if (!emp) return;

    const roleId = this.assignSelectedRoleId();
    const level = this.assignSelectedLevel() || 'Junior';

    const payload = buildEmployeePayload({ ...emp, jobRoleLevel: level, jobRole: roleId }, {
      selectedRoleId: roleId,
      levels: this.jobRoleLevelsList(),
      companies: this.companiesList(),
    });

    const uiFallback = buildEmployeeUiFallback({ ...emp, jobRole: roleId ? (this.jobRolesList().find(r => String(r.id) === String(roleId))?.name || '') : '', jobRoleLevel: level }, emp.id);

    this.employeesService.updateEmployee(emp.id, payload, uiFallback).subscribe({
      next: () => {
        this.employeesService.loadAllEmployees().subscribe({ next: (emps) => { this.employeesList.set(emps); this.recomputeUnassignedFlag(); } });
        this.showAssignPanel.set(false);
      },
      error: () => {
        this.statusMessage = { text: 'Errore durante l\'aggiornamento', type: 'error' };
      }
    });
  }

  isEmployeeUnassigned(employeeId: string): boolean {
    if(!employeeId) return false;
    const emp = this.employeesList().find(e => String(e.id) === String(employeeId));
    return emp ? (emp.jobRole || '').toString().toLowerCase() === 'unassigned' : false;
  }

  closeAssignPanel() {
    this.activeAssignIndex.set(null);
  }

  recomputeUnassignedFlag() {
    const projectEmpIds = (this.projectEmployees.getRawValue() || []).map((pe: any) => String(pe.employeeId || pe.id)).filter(Boolean);
    const allEmps = this.employeesList() || [];
    const has = allEmps.some(e => projectEmpIds.includes(String(e.id)) && ((e.jobRole || '').toString().toLowerCase() === 'unassigned'));
    this.hasUnassignedInProject.set(has);
  }


  onAssignSaved(updated: Employee[]) {
    this.activeAssignIndex.set(null);
    let updatedProjectEmployee: any = null;
    
    if (updated && updated.length > 0) {
      const updatedEmp = updated[0];
      const controls = this.projectEmployees.controls;
      
      for (let i = 0; i < controls.length; i++) {
        const ctrl = controls[i];
        const ctrlId = ctrl.get('employeeId')?.value || ctrl.get('id')?.value;
        
        if (String(ctrlId) === String(updatedEmp.id)) {
          ctrl.patchValue({
            jobRole: this.resolveLookupId(this.jobRolesList(), updatedEmp.jobRole),
            jobRoleLevel: this.resolveLookupId(this.jobRoleLevelsList(), updatedEmp.jobRoleLevel),
          });
          ctrl.markAsDirty();
          updatedProjectEmployee = ctrl.getRawValue();
          break;
        }
      }
    }

    if (updatedProjectEmployee) {
      this.persistProjectEmployeeAssignment(updatedProjectEmployee);
    }

    this.employeesService.loadAllEmployees().subscribe({
      next: (emps) => {
        this.employeesList.set(emps);
        this.recomputeUnassignedFlag();
        
        this.hasMadeInlineAssignment.set(true); 
        this.editProjectForm.markAsDirty();
        this.cdr.markForCheck();
      }
    });
  }

  private persistProjectEmployeeAssignment(projectEmployee: any) {
    const projectId = this.selectedProjectToEdit().id;
    const projectEmployeeId = getProjectEmployeeRequestId(projectEmployee);
    const payload = buildProjectEmployeePayload(projectEmployee);

    this.projectsService.updateProjectEmployee(projectId, projectEmployeeId, payload).subscribe({
      next: () => {
        this.saveInitialSnapshot();
        this.showNotification('Ruolo della risorsa aggiornato anche nel progetto.', 'success');
      },
      error: (error) => {
        console.error('Errore durante l\'aggiornamento della risorsa nel progetto:', error);
        this.showNotification('Risorsa aggiornata, ma errore nel salvataggio del ruolo nel progetto.', 'error');
      },
    });
  }

  private populateForm(projectData: any) {
    this.editProjectForm.patchValue(projectData);

    if (projectData.projectJobRoles && Array.isArray(projectData.projectJobRoles)) {
      projectData.projectJobRoles.forEach((role: any) => {
        this.projectJobRoles.push(this.fb.group(role));
      });
    }

    if (projectData.projectEmployees && Array.isArray(projectData.projectEmployees)) {
      projectData.projectEmployees.forEach((emp: any) => {
        this.projectEmployees.push(this.fb.group(emp));
      });
    }
  }

  private setupReactiveCalculations() {
    this.editProjectForm.get('startDate')?.valueChanges.subscribe(() => this.recalculateDateRange());
    this.editProjectForm.get('endDate')?.valueChanges.subscribe(() => this.recalculateDateRange());

    this.editProjectForm.get('totalDays')?.valueChanges.subscribe((days) => {
      const start = parseIsoDate(this.editProjectForm.get('startDate')?.value);
      const totalDays = Number(days);

      if (start && Number.isFinite(totalDays) && totalDays > 0) {
        this.dateRangeError = false;
        const newEndDate = getDateAfterDays(start, totalDays);
        this.editProjectForm.patchValue({ endDate: newEndDate }, { emitEvent: false });
      }
    });

    this.projectJobRoles.valueChanges.subscribe(() => this.recalculateTotals());
    this.projectEmployees.valueChanges.subscribe(() => this.recalculateTotals());
  }

  private recalculateDateRange() {
    const start = parseIsoDate(this.editProjectForm.get('startDate')?.value);
    const end = parseIsoDate(this.editProjectForm.get('endDate')?.value);

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
    this.editProjectForm.patchValue({ totalDays: diff }, { emitEvent: false });
  }

  private recalculateTotals() {
    const roles = this.projectJobRoles.getRawValue() || [];
    const employees = this.projectEmployees.getRawValue() || [];
    const totals = calculateProjectTotals([...roles, ...employees]);

    this.editProjectForm.patchValue({
      totalDays: totals.totalDays,
      totalBudget: formatEuroCurrency(totals.totalBudget)
    }, { emitEvent: false });
  }

  get projectJobRoles(): FormArray {
    return this.editProjectForm.get('projectJobRoles') as FormArray;
  }

  get projectEmployees(): FormArray {
    return this.editProjectForm.get('projectEmployees') as FormArray;
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

    const currentFormValue = this.editProjectForm.getRawValue();
    return getProjectFormComparableSnapshot(currentFormValue) !== this.originalComparableSnapshot;
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

  isSubmitDisabled(): boolean {
    if(!this.initialFormData) return true;
    return this.isSaving() || this.editProjectForm.invalid || !this.hasValidRoles() || !this.hasValidResources() || !this.isChanged();
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

  // Blocchiamo il form per evitare click multipli
  this.isSaving.set(true);

  const projectId = this.selectedProjectToEdit().id;
  const formValue = this.editProjectForm.getRawValue();

  // Ricalcolo del budget puro per il backend
  const rawTotals = calculateProjectTotals([...formValue.projectJobRoles, ...formValue.projectEmployees]);
  formValue.totalBudget = rawTotals.totalBudget;

  // Liste per separare i compiti
  const deleteCalls: any[] = [];
  const saveCalls: any[] = [];

  const originalRoles = this.initialFormData?.projectJobRoles || [];
  const currentRoles = formValue.projectJobRoles || [];
  const rolesToRemove = getRemovedProjectItems(originalRoles, currentRoles);

  const originalEmployees = this.initialFormData?.projectEmployees || [];
  const currentEmployees = formValue.projectEmployees || [];
  const employeesToRemove = getRemovedProjectItems(originalEmployees, currentEmployees);

  rolesToRemove.forEach((role) => deleteCalls.push(this.projectsService.deleteProjectJobRole(projectId, role.id)));
  employeesToRemove.forEach((employee) => deleteCalls.push(this.projectsService.deleteProjectEmployee(projectId, getProjectEmployeeRequestId(employee))));

  saveCalls.push(this.projectsService.updateProject(this.buildProjectPayload(projectId, formValue)));

  currentRoles.forEach((role: any) => {
    const rolePayload = buildProjectJobRolePayload(role);
    const originalRole = findProjectItemById(this.initialFormData?.projectJobRoles || [], role.id);

    if (this.isTemporaryRoleId(role.id)) {
      saveCalls.push(this.projectsService.addProjectJobRole(projectId, [rolePayload]));
    } else if (hasProjectItemChanged(role, originalRole)) {
      saveCalls.push(this.projectsService.updateProjectJobRole(projectId, role.id, rolePayload));
    }
  });

  currentEmployees.forEach((employee: ProjectEmployee) => {
    const employeePayload = buildProjectEmployeePayload(employee);
    const originalEmployee = findProjectItemById(this.initialFormData?.projectEmployees || [], employee.id);

    if (this.isTemporaryEmployeeId(employee.id)) {
      const equivalentOriginalEmployee = findEquivalentProjectEmployee(this.initialFormData?.projectEmployees || [], employee);
      if (!equivalentOriginalEmployee) {
        saveCalls.push(this.projectsService.addProjectEmployee(projectId, [employeePayload]));
      }
    } else if (hasProjectItemChanged(employee, originalEmployee)) {
      saveCalls.push(this.projectsService.updateProjectEmployee(projectId, getProjectEmployeeRequestId(employee), employeePayload));
    }
  });

  if (deleteCalls.length > 0) {
    // Prima le cancellazioni
    forkJoin(deleteCalls).subscribe({
      next: () => {
        // Solo quando le cancellazioni sono completate con successo, passiamo ai salvataggi
        this.executeSaves(saveCalls, formValue);
      },
      error: (error) => {
        this.isSaving.set(false);
        console.error("Errore durante la pulizia dei dati:", error);
        this.showNotification("Errore durante la rimozione dei vecchi ruoli/risorse.", 'error');
      }
    });
  } else {
    // Se non c'è nulla da cancellare, passiamo direttamente al salvataggio
    this.executeSaves(saveCalls, formValue);
  }
}

// Funzione di supporto per eseguire inserimenti e modifiche
private executeSaves(saveCalls: any[], formValue: any) {
  if (saveCalls.length === 0) {
    this.finalizeSubmit(formValue);
    return;
  }

  forkJoin(saveCalls).subscribe({
    next: () => {
      this.finalizeSubmit(formValue);
    },
    error: (error) => {
      this.isSaving.set(false);
      console.error("Errore durante il salvataggio dei dati:", error);
      this.showNotification("Errore durante l'aggiornamento dei dati del progetto.", 'error');
    }
  });
}

// Funzione di supporto per concludere la procedura
private finalizeSubmit(formValue: any) {
  this.isSaving.set(false);
  this.hasMadeInlineAssignment.set(false);
  this.showNotification('Progetto e dettagli aggiornati con successo!', 'success');
  this.saved.emit(formValue);
  this.saveInitialSnapshot();
}

  onCancel() {
    this.cancel.emit();
  }

  onFieldChange() {
    this.noChangesMessage = false;
    this.attemptedSubmit = false;
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

    const pmId = this.editProjectForm.get('pmId')?.value;
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
    this.editProjectForm.get('pmId')?.setValue(employee ? (employee.id || employee.Id) : null);
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

  private buildProjectPayload(projectId: string, formValue: any): any {
    const selectedCompany = this.companiesList().find((company) => company.id === formValue.companyId)?.name;
    const selectedCustomer = this.customersList().find((customer) => customer.id === formValue.customerId)?.name;
    const selectedStatus = this.projectStatusesList().find((status) => status.id === formValue.projectStatusId)?.name;
    const selectedPm = this.employeesList().find((employee) => employee.id === formValue.pmId);

    return buildProjectUpdatePayload(formValue, projectId, {
      company: selectedCompany,
      customer: selectedCustomer,
      projectStatus: selectedStatus,
      pm: selectedPm ? `${selectedPm.name} ${selectedPm.surname}` : formValue.pm,
    });
  }

  private isTemporaryRoleId(id: string): boolean {
    return isTemporaryProjectItem(id, this.initialFormData?.projectJobRoles as ProjectRole[]);
  }

  private isTemporaryEmployeeId(id: string): boolean {
    return isTemporaryProjectItem(id, this.initialFormData?.projectEmployees as ProjectEmployee[]);
  }

  private saveInitialSnapshot() {
    const currentVal = this.editProjectForm.getRawValue();
    this.initialFormData = JSON.parse(JSON.stringify(currentVal));
    this.originalComparableSnapshot = getProjectFormComparableSnapshot(currentVal);
  }

  private showNotification(text: string, type: 'success' | 'error') {
    this.statusMessage = { text, type };
    timer(3000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.statusMessage = null;
    });
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
