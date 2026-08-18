import { Component, HostListener, OnInit, inject, input, output, signal, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { Project } from '../../../../shared/models/project.model';
import { TextInputComponent } from '../../../../shared/text-input/text-input.component';
import { AssignSingleComponent } from '../assign-single/assign-single.component';
import { JobRole } from '../../../../shared/models/job-role.model';
import { Employee } from '../../../../shared/models/employee.model';
import { ProjectsService } from '../../../../shared/services/projects.service';
import { EmployeesService } from '../../../../shared/services/employees.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';
import { NotifyAction } from '../../../../shared/enums/notify.enum';
import { ProjectFormFacade } from '../../../../shared/utils/project-form.facade';
import {
  cloneProjectForEdit,
  normalizeProjectFormData,
  calculateProjectTotals,
  createEmptyProjectRole,
  createEmptyProjectEmployee,
  getWinProbabilityError,
  toElementId,
  getProjectFieldPattern,
  buildEditableProjectHeaders,
  getProjectFormComparableSnapshot,
  isProjectRoleComplete,
  isProjectEmployeeComplete
} from '../../../../shared/utils/project-form.utils';
import {
  buildProjectUpdatePayload,
  normalizeProjectBudgetForForm, 
} from '../../../../shared/payloads/project.payloads';
import { buildEmployeePayload, buildEmployeeUiFallback } from '../../../../shared/payloads/employee.payloads';

@Component({
  selector: 'app-modifica-progetto',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TextInputComponent, AssignSingleComponent],
  templateUrl: './edit-project.component.html',
  providers: [ProjectFormFacade]
})
export class EditProjectComponent implements OnInit {
  public facade = inject(ProjectFormFacade);
  private projectsService = inject(ProjectsService);
  private employeesService = inject(EmployeesService);
  private snackbarService = inject(SnackbarService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  selectedProjectToEdit = input.required<Project>();
  saved = output<Project>();
  cancel = output<void>();

  editProjectForm!: FormGroup;

  showAssignPanel = signal(false);
  assignRole = signal<JobRole | null>(null);
  assignList = signal<Employee[]>([]);
  assignSelectedEmployeeId = signal<string | null>(null);
  assignSelectedRoleId = signal<string | null>(null);
  assignSelectedLevel = signal<string | null>(null);
  hasUnassignedInProject = signal(false);
  activeAssignIndex = signal<number | null>(null);
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
    this.headers.forEach(h => {
      const isRequired = ['name', 'companyId', 'customerId', 'pmId', 'winProbability'].includes(h.key);
      formControls[h.key] = ['', isRequired ? Validators.required : null];
    });
    formControls['projectJobRoles'] = this.fb.array([]);
    formControls['projectEmployees'] = this.fb.array([]);
    this.editProjectForm = this.fb.group(formControls);
  }

  ngOnInit() {
    const clonedProject = cloneProjectForEdit(this.selectedProjectToEdit());

    this.facade.loadAllLookups().subscribe((lookups) => {
      normalizeProjectFormData(clonedProject, lookups);
      normalizeProjectBudgetForForm(clonedProject);

      this.editProjectForm.patchValue(clonedProject);
      clonedProject.projectJobRoles?.forEach((role: any) => this.projectJobRoles.push(this.fb.group(role)));
      clonedProject.projectEmployees?.forEach((emp: any) => this.projectEmployees.push(this.fb.group(emp)));

      this.facade.initialFormData = JSON.parse(JSON.stringify(clonedProject));

      this.facade.originalFormSnapshot.set(getProjectFormComparableSnapshot(this.editProjectForm.getRawValue()));

      this.facade.setupReactiveCalculations(this.editProjectForm);
      this.recomputeUnassignedFlag();
      this.cdr.detectChanges();
    });
  }

  get isButtonDisabled(): boolean {
    return this.facade.isButtonDisabled(this.editProjectForm, this.isSaving());
  }

  isChanged(): boolean {
    if (this.facade.hasMadeInlineAssignment()) return true;
    const currentFormValue = this.editProjectForm.getRawValue();
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
    const projectId = this.selectedProjectToEdit().id;
    const formValue = this.editProjectForm.getRawValue();

    const rawTotals = calculateProjectTotals([...formValue.projectJobRoles, ...formValue.projectEmployees]);
    formValue.totalBudget = rawTotals.totalBudget;

    const projectPayload = this.buildProjectPayload(projectId, formValue);
    const pendingEmployeeCalls: Observable<any>[] = [];
    
    this.facade.pendingEmployeeAssignments.forEach((employee) => {
      pendingEmployeeCalls.push(this.buildPendingEmployeeAssignmentCall(employee));
    });

    this.projectsService.updateProjectWithDetails(
      projectId,
      projectPayload,
      this.facade.initialFormData,
      formValue.projectJobRoles || [],
      formValue.projectEmployees || [],
      pendingEmployeeCalls
    ).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.facade.hasMadeInlineAssignment.set(false);
        this.facade.pendingEmployeeAssignments.clear();
        this.snackbarService.success(NotifyAction.UpdateProject, "progetto");
        this.saved.emit(formValue);
      },
      error: (error) => {
        this.isSaving.set(false);
        console.error(error);
        this.snackbarService.error(NotifyAction.UpdateProject, "progetto", "Chiudi");
      }
    });
  }

  get projectJobRoles(): FormArray { return this.editProjectForm.get('projectJobRoles') as FormArray; }
  get projectEmployees(): FormArray { return this.editProjectForm.get('projectEmployees') as FormArray; }

  addRole() { this.projectJobRoles.push(this.fb.group(createEmptyProjectRole())); }
  addEmployee() { this.projectEmployees.push(this.fb.group(createEmptyProjectEmployee())); }
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
    const pmId = this.editProjectForm.get('pmId')?.value;
    return this.employeeName(this.facade.employeesList().find((e) => (e.id || e.Id) === pmId));
  }

  filteredPmOptions(): any[] {
    const term = this.facade.showAllPmOptions() ? '' : this.facade.pmFilterValue().trim().toLowerCase();
    if (!term) return this.facade.employeesList();
    return this.facade.employeesList().filter((e) => this.employeeName(e).toLowerCase().includes(term));
  }

  onPmFocus() { this.facade.showAllPmOptions.set(true); this.facade.pmDropdownOpen.set(true); }
  onPmInput(event: Event) {
    this.facade.pmFilterValue.set((event.target as HTMLInputElement).value);
    this.facade.showAllPmOptions.set(false);
    this.facade.pmDropdownOpen.set(true);
  }
  togglePmDropdown() { this.facade.showAllPmOptions.set(true); this.facade.pmDropdownOpen.update((open) => !open); }
  selectPm(employee: any | null) {
    this.editProjectForm.get('pmId')?.setValue(employee ? (employee.id || employee.Id) : null);
    this.facade.pmFilterValue.set('');
    this.facade.pmDropdownOpen.set(false);
    this.facade.showAllPmOptions.set(false);
    this.onFieldChange();
  }
  clearPm() { this.selectPm(null); }

  recomputeUnassignedFlag() {
    const projectEmpIds = (this.projectEmployees.getRawValue() || []).map((pe: any) => String(pe.employeeId || pe.id)).filter(Boolean);
    const has = this.facade.employeesList().some(e => projectEmpIds.includes(String(e.id)) && ((e.jobRole || '').toString().toLowerCase() === 'unassigned'));
    this.hasUnassignedInProject.set(has);
  }

  openAssignPanel() {
    const allRoles = this.facade.jobRolesList() || [];
    const foundUnassigned = allRoles.find(r => (r?.name || '').toString().trim().toLowerCase() === 'unassigned');
    const roleForPanel: JobRole = foundUnassigned ? foundUnassigned : { id: 'UNASSIGNED-FALLBACK', name: 'Unassigned', isDefault: false } as any;

    const projectEmps = this.projectEmployees.getRawValue() || [];
    const projectEmpIds = projectEmps.map((pe: any) => String(pe.employeeId || pe.id)).filter(Boolean);
    const assignedUnassignedInProject = this.facade.employeesList().filter(e => projectEmpIds.includes(String(e.id)) && ((e.jobRole || '').toString().toLowerCase() === 'unassigned'));

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
    const e = this.facade.employeesList().find(x => String(x.id) === String(id));
    if (e) {
      this.assignSelectedLevel.set(e.jobRoleLevel || null);
      this.assignSelectedRoleId.set(e.jobRole || null);
    }
  }

  saveAssignSingle() {
    const empId = this.assignSelectedEmployeeId();
    if (!empId) return;
    const emp = this.facade.employeesList().find(x => String(x.id) === String(empId));
    if (!emp) return;

    const roleId = this.assignSelectedRoleId();
    const level = this.assignSelectedLevel() || 'Junior';
    const roleName = roleId ? (this.facade.jobRolesList().find(r => String(r.id) === String(roleId))?.name || '') : '';

    this.onAssignSaved([{ ...emp, jobRole: roleName, jobRoleLevel: level } as Employee]);
    this.showAssignPanel.set(false);
  }

  isEmployeeUnassigned(employeeId: string): boolean {
    if(!employeeId) return false;
    const emp = this.facade.employeesList().find(e => String(e.id) === String(employeeId));
    return emp ? (emp.jobRole || '').toString().toLowerCase() === 'unassigned' : false;
  }

  closeAssignPanel() { this.activeAssignIndex.set(null); }

  onAssignSaved(updated: Employee[]) {
    this.activeAssignIndex.set(null);
    if (updated && updated.length > 0) {
      const updatedEmp = updated[0];
      const resolvedRoleId = this.facade.resolveLookupId(this.facade.jobRolesList(), updatedEmp.jobRole);
      const resolvedLevelId = this.facade.resolveLookupId(this.facade.jobRoleLevelsList(), updatedEmp.jobRoleLevel);
      const controls = this.projectEmployees.controls;
      
      this.facade.pendingEmployeeAssignments.set(String(updatedEmp.id), updatedEmp);
      this.facade.employeesList.update((employees) =>
        employees.map((employee) => String(employee.id) === String(updatedEmp.id) ? updatedEmp : employee)
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

      this.recomputeUnassignedFlag();
      this.facade.hasMadeInlineAssignment.set(true); 
      this.editProjectForm.markAsDirty();
      this.cdr.markForCheck();
    }
  }

  onCancel() { this.cancel.emit(); }
  onFieldChange() { this.noChangesMessage = false; this.attemptedSubmit = false; }
  isNumericField(key: string): boolean { return key === 'winProbability' || key === 'totalDays'; }
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
      this.attemptedSubmit = true;
      if (!this.isChanged()) {
        this.noChangesMessage = true;
      }
    }
  }

  private buildProjectPayload(projectId: string, formValue: any): any {
    const selectedCompany = this.facade.companiesList().find((company) => company.id === formValue.companyId)?.name;
    const selectedCustomer = this.facade.customersList().find((customer) => customer.id === formValue.customerId)?.name;
    const selectedStatus = this.facade.projectStatusesList().find((status) => status.id === formValue.projectStatusId)?.name;
    const selectedPm = this.facade.employeesList().find((employee) => employee.id === formValue.pmId);

    return buildProjectUpdatePayload(formValue, projectId, this.selectedProjectToEdit().isFavorite, {
      company: selectedCompany,
      customer: selectedCustomer,
      projectStatus: selectedStatus,
      pm: selectedPm ? `${selectedPm.name} ${selectedPm.surname}` : formValue.pm,
    });
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