import { inject, Injectable, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { forkJoin, Observable, tap } from 'rxjs';
import { LookupsService } from '../services/lookups.service';
import { CustomersService } from '../services/customers.service';
import { RolesService } from '../services/roles.service';
import { EmployeesService } from '../services/employees.service';
import { Employee } from '../models/employee.model';
import { 
  calculateProjectTotals, 
  formatEuroCurrency, 
  getDateAfterDays, 
  getExclusiveDaysDiff, 
  parseIsoDate,
  isProjectRoleComplete,
  isProjectEmployeeComplete,
  getWinProbabilityError,
  getProjectFormComparableSnapshot,
  createEmptyProjectEmployee,
  createEmptyProjectRole,
  getProjectFieldPattern
} from '../utils/project-form.utils';

@Injectable()
export class ProjectFormFacade {
  private fb = inject(FormBuilder);
  private lookupsService = inject(LookupsService);
  private customersService = inject(CustomersService);
  private rolesService = inject(RolesService);
  private employeesService = inject(EmployeesService);

  // Liste dei Lookup dei dati di supporto
  companiesList = signal<any[]>([]);
  customersList = signal<any[]>([]);
  projectStatusesList = signal<any[]>([]);
  employeesList = signal<any[]>([]);
  jobRolesList = signal<any[]>([]);
  jobRoleLevelsList = signal<any[]>([]);

  pmDropdownOpen = signal(false);
  showAllPmOptions = signal(false);
  pmFilterValue = signal('');

  dateRangeError = signal(false);
  hasMadeInlineAssignment = signal(false);
  pendingEmployeeAssignments = new Map<string, Employee>();
  originalFormSnapshot = signal('');
  initialFormData: any = null; 

  loadAllLookups(): Observable<any> {
    return forkJoin({
      companies: this.lookupsService.loadAvailableCompanies(),
      customers: this.customersService.loadAvailableCustomers(),
      statuses: this.lookupsService.loadProjectStatuses(),
      roles: this.rolesService.loadAllJobRoles(),
      levels: this.rolesService.loadJobRoleLevels(),
      employees: this.employeesService.loadAllEmployees(),
    }).pipe(
      tap((lookups) => {
        this.companiesList.set(lookups.companies);
        this.customersList.set(lookups.customers);
        this.projectStatusesList.set(lookups.statuses);
        this.employeesList.set(lookups.employees);
        this.jobRolesList.set(lookups.roles);
        this.jobRoleLevelsList.set(lookups.levels);
      })
    );
  }

  createRoleGroup(): FormGroup {
    const emptyRole = createEmptyProjectRole();
    return this.fb.group({
      id: [emptyRole.id],
      jobRole: [emptyRole.jobRole, Validators.required],
      jobRoleLevel: [emptyRole.jobRoleLevel, Validators.required],
      dailyCost: [emptyRole.dailyCost, [Validators.required, Validators.min(1)]],
      daysSpent: [emptyRole.daysSpent, [Validators.required, Validators.min(1)]],
      winProbability: [emptyRole.winProbability, [Validators.required, Validators.pattern(getProjectFieldPattern('winProbability'))]]
    });
  }

  createEmployeeGroup(): FormGroup {
    const emptyEmp = createEmptyProjectEmployee();
    return this.fb.group({
      id: [emptyEmp.id],
      employeeId: [emptyEmp.employeeId, Validators.required],
      dailyCost: [emptyEmp.dailyCost, [Validators.required, Validators.min(1)]],
      daysSpent: [emptyEmp.daysSpent, [Validators.required, Validators.min(1)]],
      winProbability: [emptyEmp.winProbability, [Validators.required, Validators.pattern(getProjectFieldPattern('winProbability'))]]
    });
  }

  setupReactiveCalculations(form: FormGroup) {
    form.get('startDate')?.valueChanges.subscribe(() => this.recalculateDateRange(form));
    form.get('endDate')?.valueChanges.subscribe(() => this.recalculateDateRange(form));

    form.get('totalDays')?.valueChanges.subscribe((days) => {
      const start = parseIsoDate(form.get('startDate')?.value);
      const totalDays = Number(days);

      if (start && Number.isFinite(totalDays) && totalDays > 0) {
        this.dateRangeError.set(false);
        const newEndDate = getDateAfterDays(start, totalDays);
        form.patchValue({ endDate: newEndDate }, { emitEvent: false });
      }
    });

    (form.get('projectJobRoles') as FormArray).valueChanges.subscribe(() => this.recalculateTotals(form));
    (form.get('projectEmployees') as FormArray).valueChanges.subscribe(() => this.recalculateTotals(form));
  }

  private recalculateDateRange(form: FormGroup) {
    const start = parseIsoDate(form.get('startDate')?.value);
    const end = parseIsoDate(form.get('endDate')?.value);

    if (!start || !end) {
      this.dateRangeError.set(false);
      return;
    }
    if (end < start) {
      this.dateRangeError.set(true);
      return;
    }
    this.dateRangeError.set(false);
    const diff = getExclusiveDaysDiff(start, end);
    form.patchValue({ totalDays: diff }, { emitEvent: false });
  }

  private recalculateTotals(form: FormGroup) {
    const roles = (form.get('projectJobRoles') as FormArray).getRawValue() || [];
    const employees = (form.get('projectEmployees') as FormArray).getRawValue() || [];
    const totals = calculateProjectTotals([...roles, ...employees]);

    form.patchValue({
      totalBudget: formatEuroCurrency(totals.totalBudget)
    }, { emitEvent: false });
  }

  resolveLookupId(options: any[], value: string | null | undefined): string | null {
    if (!value) return null;
    const valueAsString = String(value);
    const normalizedValue = valueAsString.trim().toLowerCase();
    const match = options.find((option) =>
      String(option.id || option.Id) === valueAsString ||
      String(option.name || option.Name || '').trim().toLowerCase() === normalizedValue
    );
    return match ? (match.id || match.Id) : valueAsString;
  }

  handleEmployeeChange(form: FormGroup, index: number) {
  const projectEmployees = form.get('projectEmployees') as FormArray;
  const group = projectEmployees.at(index) as FormGroup;
  const empId = group.get('employeeId')?.value;

  // Cerchiamo la risorsa selezionata direttamente qui nel Facade
  const emp = this.employeesList().find(e => String(e.id) === String(empId));

  if (emp) {
    if (!group.get('jobRole')) group.addControl('jobRole', this.fb.control(null));
    if (!group.get('jobRoleLevel')) group.addControl('jobRoleLevel', this.fb.control(null));

    const resolvedRoleId = this.resolveLookupId(this.jobRolesList(), emp.jobRole);
    const resolvedLevelId = this.resolveLookupId(this.jobRoleLevelsList(), emp.jobRoleLevel);

    group.patchValue({
      jobRole: resolvedRoleId,
      jobRoleLevel: resolvedLevelId
    }, { emitEvent: false });
  }
}

  isButtonDisabled(form: FormGroup, isSaving: boolean): boolean {
    const projectDays = Number(form.get('totalDays')?.value || 0);
    const roles = (form.get('projectJobRoles') as FormArray).getRawValue() || [];
    const employees = (form.get('projectEmployees') as FormArray).getRawValue() || [];

    const totalAllocatedDays = roles.reduce((sum: number, r: any) => sum + Number(r.daysSpent || 0), 0) +
                               employees.reduce((sum: number, e: any) => sum + Number(e.daysSpent || 0), 0);

    const resourceDaysExceeded = totalAllocatedDays > projectDays;

    const isChanged = this.hasMadeInlineAssignment() || 
      getProjectFormComparableSnapshot(form.getRawValue()) !== this.originalFormSnapshot();

    const hasValidRoles = roles.length === 0 || roles.every((role: any) => isProjectRoleComplete(role) && !getWinProbabilityError(role));
    const hasValidResources = employees.length === 0 || employees.every((emp: any) => isProjectEmployeeComplete(emp) && !getWinProbabilityError(emp));

    return isSaving || 
           this.dateRangeError() || 
           resourceDaysExceeded || 
           form.invalid || 
           !hasValidRoles || 
           !hasValidResources || 
           !isChanged;
  }
}