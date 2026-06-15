import { Component, HostListener, OnInit, inject, output, signal, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { Project } from '../../../shared/models/project.model';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { AssignSingleComponent } from '../project/assign-single/assign-single.component';
import { Employee } from '../../../shared/models/employee.model';
import { ProjectsService } from '../../../shared/services/projects.service';
import { EmployeesService } from '../../../shared/services/employees.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { NotifyAction } from '../../../shared/enums/notify.enum';
import { ProjectFormFacade } from '../../../shared/utils/project-form.facade';
import {
  buildEditableProjectHeaders,
  calculateProjectTotals,
  createEmptyProjectEmployee,
  createEmptyProjectRole,
  getWinProbabilityError,
  toElementId,
  getProjectFieldPattern,
  getTodayIsoDate,
  getProjectFormComparableSnapshot,
  isProjectRoleComplete,
  isProjectEmployeeComplete
} from '../../../shared/utils/project-form.utils';
import { buildEmployeePayload, buildEmployeeUiFallback } from '../../../shared/payloads/employee.payloads';

@Component({
  selector: 'app-new-progetto',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TextInputComponent, AssignSingleComponent],
  templateUrl: './new-project.component.html',
  providers: [ProjectFormFacade]
})
export class NewProgettoComponent implements OnInit {
  public facade = inject(ProjectFormFacade);
  private projectsService = inject(ProjectsService);
  private employeesService = inject(EmployeesService);
  private snackbarService = inject(SnackbarService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  // Output nativi del componente
  created = output<Project>();
  cancel = output<void>();

  newProjectForm!: FormGroup;

  activeAssignIndex = signal<number | null>(null);
  assignSelectedEmployeeId = signal<string | null>(null);
  isSaving = signal(false);
  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;


  readonly headers = buildEditableProjectHeaders();
  readonly getPattern = getProjectFieldPattern;

  constructor() {
    this.initForm();
    
    effect(() => {
      this.facade.employeesList();
      this.recomputeUnassignedFlag();
    });
  }

  initForm() {
    const formControls: { [key: string]: any } = {};
    this.headers.forEach(header => {
      const initialValue = header.key === 'startDate' ? getTodayIsoDate() : '';
      const isRequired = ['name', 'companyId', 'customerId', 'pmId', 'winProbability'].includes(header.key);
      formControls[header.key] = [initialValue, isRequired ? Validators.required : null];
    });
    formControls['projectJobRoles'] = this.fb.array([]);
    formControls['projectEmployees'] = this.fb.array([]);
    this.newProjectForm = this.fb.group(formControls);
  }

  ngOnInit() {
    this.facade.loadAllLookups().subscribe((lookups) => {
      const defaultStatusId = lookups.statuses.find((status: any) => status.name === 'Initiation')?.id || null;
      this.newProjectForm.patchValue({ projectStatusId: defaultStatusId }, { emitEvent: false });

      // Attiviamo i calcoli matematici reattivi sul form corrente
      this.facade.setupReactiveCalculations(this.newProjectForm);
      
      // Inizializziamo gli snapshot dei dati dentro il Facade per il controllo modifiche
      const initialFormVal = this.newProjectForm.getRawValue();
      this.facade.originalFormSnapshot.set(getProjectFormComparableSnapshot(initialFormVal));
      this.facade.initialFormData = JSON.parse(JSON.stringify(initialFormVal));

      this.cdr.detectChanges();
    });  
  }

  get isButtonDisabled(): boolean {
    return this.facade.isButtonDisabled(this.newProjectForm, this.isSaving());
  }

  isChanged(): boolean {
    if (this.facade.hasMadeInlineAssignment()) return true;
    const currentFormValue = this.newProjectForm.getRawValue();
    return getProjectFormComparableSnapshot(currentFormValue) !== this.facade.originalFormSnapshot();
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

  submit() {
    if (this.isButtonDisabled) return;

    this.isSaving.set(true);
    const formValue = this.newProjectForm.getRawValue();
    
    // Calcolo del budget totale aggregato prima dell'invio
    const rawTotals = calculateProjectTotals([...formValue.projectJobRoles, ...formValue.projectEmployees]);
    const projectPayload = {
      ...formValue,
      totalBudget: rawTotals.totalBudget,
    };

    const pendingEmployeeCalls: Observable<any>[] = [];
    this.facade.pendingEmployeeAssignments.forEach((employee) => {
      pendingEmployeeCalls.push(this.buildPendingEmployeeAssignmentCall(employee));
    });

    this.projectsService.addProjectWithDetails(
      projectPayload,
      formValue.projectJobRoles || [],
      formValue.projectEmployees || [],
      pendingEmployeeCalls
    ).subscribe({
      next: (createdProject) => {
        this.snackbarService.success(NotifyAction.Creazione, 'progetto');
        this.finalizeSubmit(createdProject);
      },
      error: (error) => {
        this.isSaving.set(false);
        console.error("Errore durante la creazione del progetto", error);
        this.snackbarService.error(NotifyAction.Creazione, 'progetto', 'Chiudi');
      }
    });
  }

  private finalizeSubmit(createdProject: Project) {
    this.isSaving.set(false);
    this.facade.hasMadeInlineAssignment.set(false);
    this.facade.pendingEmployeeAssignments.clear();
    this.created.emit(createdProject);
  }

  get projectJobRoles(): FormArray { return this.newProjectForm.get('projectJobRoles') as FormArray; }
  get projectEmployees(): FormArray { return this.newProjectForm.get('projectEmployees') as FormArray; }

  addRole() { this.projectJobRoles.push(this.facade.createRoleGroup()); }
  addEmployee() { this.projectEmployees.push(this.facade.createEmployeeGroup()); }
  removeRole(index: number) { this.projectJobRoles.removeAt(index); }
  removeEmployee(index: number) { this.projectEmployees.removeAt(index); }

  getOptions(key: string): any[] {
    switch (key) {
      case 'projectStatusId': return this.facade.projectStatusesList();
      case 'companyId': return this.facade.companiesList();
      case 'customerId': return this.facade.customersList();
      case 'pmId': return this.facade.employeesList();
      default: return [];
    }
  }

  employeeName(employee: any): string {
    return `${employee?.name || employee?.Name || ''} ${employee?.surname || employee?.Surname || ''}`.trim();
  }

  pmInputValue(): string {
    if (this.facade.pmDropdownOpen() && !this.facade.showAllPmOptions()) return this.facade.pmFilterValue();
    const pmId = this.newProjectForm.get('pmId')?.value;
    return this.employeeName(this.facade.employeesList().find((emp) => (emp.id || emp.Id) === pmId));
  }

  filteredPmOptions(): any[] {
    const term = this.facade.showAllPmOptions() ? '' : this.facade.pmFilterValue().trim().toLowerCase();
    if (!term) return this.facade.employeesList();
    return this.facade.employeesList().filter((emp) => this.employeeName(emp).toLowerCase().includes(term));
  }

  onPmFocus() { this.facade.showAllPmOptions.set(true); this.facade.pmDropdownOpen.set(true); }
  onPmInput(event: Event) {
    this.facade.pmFilterValue.set((event.target as HTMLInputElement).value);
    this.facade.showAllPmOptions.set(false);
    this.facade.pmDropdownOpen.set(true);
  }
  togglePmDropdown() { this.facade.showAllPmOptions.set(true); this.facade.pmDropdownOpen.update((open) => !open); }
  
  selectPm(employee: any | null) {
    this.newProjectForm.get('pmId')?.setValue(employee ? (employee.id || employee.Id) : null);
    this.facade.pmFilterValue.set('');
    this.facade.pmDropdownOpen.set(false);
    this.facade.showAllPmOptions.set(false);
    this.onFieldChange();
  }
  clearPm() { this.selectPm(null); }

  isEmployeeUnassigned(employeeId: string): boolean {
    if (!employeeId) return false;
    const emp = this.facade.employeesList().find(e => String(e.id) === String(employeeId));
    return emp ? (emp.jobRole || '').toString().toLowerCase() === 'unassigned' : false;
  }

  closeAssignPanel() { this.activeAssignIndex.set(null); }
  recomputeUnassignedFlag() {}

  onAssignSaved(updated: Employee[]) {
    this.activeAssignIndex.set(null);
    if (updated && updated.length > 0) {
      const updatedEmp = updated[0];
      const resolvedRoleId = this.facade.resolveLookupId(this.facade.jobRolesList(), updatedEmp.jobRole);
      const resolvedLevelId = this.facade.resolveLookupId(this.facade.jobRoleLevelsList(), updatedEmp.jobRoleLevel);
      const controls = this.projectEmployees.controls;
      
      this.facade.pendingEmployeeAssignments.set(String(updatedEmp.id), updatedEmp);
      this.facade.employeesList.update((employees) =>
        employees.map((emp) => String(emp.id) === String(updatedEmp.id) ? updatedEmp : emp)
      );

      for (let i = 0; i < controls.length; i++) {
        const ctrl = controls[i];
        const ctrlId = ctrl.get('employeeId')?.value || ctrl.get('id')?.value;
        if (String(ctrlId) === String(updatedEmp.id)) {
          ctrl.patchValue({ jobRole: resolvedRoleId, jobRoleLevel: resolvedLevelId });
          ctrl.markAsDirty();
          break;
        }
      }

      this.facade.hasMadeInlineAssignment.set(true); 
      this.newProjectForm.markAsDirty();
      this.cdr.markForCheck();
    }
  }

  onCancel() { this.cancel.emit(); }
  onFieldChange() { this.noChangesMessage = false; this.attemptedSubmit = false; }
  isNumericField(key: string): boolean { return key === 'winProbability' || key === 'totalDays' || key === 'totalBudget'; }
  toId(key: string, index: number): string { return toElementId('progetto', key, index); }
  getWinProbabilityError(item: any) { return getWinProbabilityError(item); }

  onWinProbabilityBlur(control: any) {
    const val = control?.value;
    if (!val) return;
    const num = parseFloat(String(val).replace(',', '.'));
    if (!isNaN(num) && num >= 1 && num <= 100) {
      control.setValue(num.toFixed(2), { emitEvent: true });
    }
    this.onFieldChange();
  }

  onSubmitClick(event: Event) {
    if (this.isButtonDisabled) {
      event.preventDefault();
      this.newProjectForm.markAllAsTouched();
      this.attemptedSubmit = true;
      if (!this.isChanged()) {
        this.noChangesMessage = true;
      }
    }
  }

  private buildPendingEmployeeAssignmentCall(employee: Employee) {
    const roleId = this.facade.resolveLookupId(this.facade.jobRolesList(), employee.jobRole);
    const roleName = roleId ? (this.facade.jobRolesList().find((role) => String(role.id) === String(roleId))?.name || employee.jobRole) : employee.jobRole;
    return this.employeesService.updateEmployee(
      employee.id,
      buildEmployeePayload(employee, { selectedRoleId: roleId, levels: this.facade.jobRoleLevelsList(), companies: this.facade.companiesList() }),
      buildEmployeeUiFallback({ ...employee, jobRole: roleName }, employee.id)
    );
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent) {
    if (!(event.target as Element | null)?.closest('.pm-combo-field')) {
      this.facade.pmDropdownOpen.set(false);
      this.facade.showAllPmOptions.set(false);
      this.facade.pmFilterValue.set('');
    }
  }
}