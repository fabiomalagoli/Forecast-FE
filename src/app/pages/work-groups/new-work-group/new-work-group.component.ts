import { Component, inject, input, output, signal, effect, OnInit, DestroyRef, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormControl } from '@angular/forms';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { WorkGroup } from '../../../shared/models/workgroups.model';
import { toElementId } from '../../../shared/utils/project-form.utils';
import { WorkGroupFormFacade } from '../../../shared/utils/workgourp-form.facade';
import { WorkGroupsService } from '../../../shared/services/workgroups.service';
import { EmployeesService } from '../../../shared/services/employees.service';
import { RolesService } from '../../../shared/services/roles.service';
import { LookupsService } from '../../../shared/services/lookups.service';
import { Employee } from '../../../shared/models/employee.model';
import { debounceTime, distinctUntilChanged, forkJoin, of, switchMap } from 'rxjs';
import { buildEmployeePayload, buildEmployeeUiFallback } from '../../../shared/payloads/employee.payloads';
import { AssignableEmployee, getEmployeeFullName } from '../../../shared/utils/employee-form.utils';
import { buildCreateWorkGroupPayload } from '../../../shared/payloads/workgroup.payloads';

@Component({
  selector: 'app-new-work-group',
  standalone: true,
  imports: [CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './new-work-group.component.html',
  providers: [WorkGroupFormFacade]
})
export class NewWorkGroupComponent implements OnInit {
  public facade = inject(WorkGroupFormFacade);
  private workGroupsService = inject(WorkGroupsService);
  private employeesService = inject(EmployeesService);
  private rolesService = inject(RolesService);
  private lookupsService = inject(LookupsService);
  private destroyRef = inject(DestroyRef);

  workGroupToAdd = input.required<WorkGroup>();
  added = output<void>();
  cancel = output<void>();

  workGroupCreateForm!: FormGroup;
  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  private originalNameSnapshot = '';

  listaRisorseSelezionate = signal<AssignableEmployee[]>([]);
  listaTotaleRisorse = signal<any[]>([]);
  listaJobRolesLevels = signal<any[]>([]);
  isLoadingLookups = signal(false);

  filtroNomeRisorsa = new FormControl('');
  filtroRisorsaValue = signal('');
  showAllEmployeeOptions = signal(false);
  employeeDropdownOpen = signal(false);

  fullName(employee: Employee): string { return getEmployeeFullName(employee); }
  optionName(option: any): string { return option?.name || option?.Name || option || ''; }

  nameFilterOptions = computed<Employee[]>(() => {
    const term = this.showAllEmployeeOptions() ? '' : this.filtroRisorsaValue();
    const available = this.listaTotaleRisorse().filter(
      emp => !this.listaRisorseSelezionate().some(sel => sel.id === emp.id)
    );
    if (!term) return available;
    return available.filter(emp => this.fullName(emp).toLowerCase().includes(term));
  });

  constructor() {
    this.workGroupCreateForm = this.facade.buildForm();
    effect(() => {
      const g = this.workGroupToAdd();
      if (!g) return;
      const groupName = g.name || '';
      this.workGroupCreateForm.patchValue({ name: groupName }, { emitEvent: false });
      this.originalNameSnapshot = groupName;
    });
  }

  ngOnInit() {
      this.isLoadingLookups.set(true);
      
      forkJoin({
        employees: this.employeesService.loadAllEmployees(),
        levels: this.rolesService.loadJobRoleLevels(),
        roles: this.rolesService.loadAllJobRoles(),
        companies: this.lookupsService.loadAvailableCompanies()
      }).subscribe({
        next: (risultati) => {
          this.listaTotaleRisorse.set(risultati.employees);
          this.listaJobRolesLevels.set(risultati.levels);
          this.isLoadingLookups.set(false);
        }
      });

      const filterSubscription = this.filtroNomeRisorsa.valueChanges.pipe(
        debounceTime(250),
        distinctUntilChanged()
      ).subscribe(value => {
        this.filtroRisorsaValue.set((value || '').toLowerCase());
        this.showAllEmployeeOptions.set(false);
      });
      this.destroyRef.onDestroy(() => filterSubscription.unsubscribe());
  }

  submit() {
    if (this.workGroupCreateForm.invalid) return;

    const formData = {
      name: this.workGroupCreateForm.value.name,
      employeeIds: this.listaRisorseSelezionate().map(emp => emp.id)
    };

    const groupPayload = buildCreateWorkGroupPayload(formData);

    this.workGroupsService.addWorkGroup(groupPayload).subscribe({
      next: () => {
        this.attemptedSubmit = false;
        this.statusMessage = { text: 'Gruppo creato e risorse assegnate con successo!', type: 'success' };
        this.added.emit();
        this.workGroupCreateForm.reset();
        this.listaRisorseSelezionate.set([]);
        this.cancel.emit();
      },
      error: () => {
        this.attemptedSubmit = true;
        this.statusMessage = { text: "Errore durante la creazione del gruppo o l'assegnazione delle risorse.", type: 'error' };
      }
    });
  }

  selectEmployeeFilter(employee: Employee) {
    if (!this.listaRisorseSelezionate().some(sel => sel.id === employee.id)) {
      this.listaRisorseSelezionate.update(selected => [
        ...selected,
        { ...employee, selectedJobRoleLevel: employee.jobRoleLevel || '' }
      ]);
    }
    this.filtroNomeRisorsa.setValue('');
    this.filtroRisorsaValue.set('');
    this.employeeDropdownOpen.set(false);
  }

  removeSelectedResource(id: string) {
    this.listaRisorseSelezionate.update(list => list.filter(emp => emp.id !== id));
  }

  updateSelectedLevel(id: string, level: string) {
    this.listaRisorseSelezionate.update(list =>
      list.map(emp => emp.id === id ? { ...emp, selectedJobRoleLevel: level } : emp)
    );
  }

  onSubmitClick(event: Event) {
    if (!this.isChanged()) {
      event.preventDefault();
      this.workGroupCreateForm.markAllAsTouched();
      this.noChangesMessage = true;
      return;
    } 
    if (this.workGroupCreateForm.invalid) {
      event.preventDefault();
      this.attemptedSubmit = true;
      this.workGroupCreateForm.markAllAsTouched();
    }
  }

  onEmployeeFilterFocus() { this.showAllEmployeeOptions.set(true); this.employeeDropdownOpen.set(true); }
  onEmployeeFilterInput() { this.showAllEmployeeOptions.set(false); this.employeeDropdownOpen.set(true); }
  toggleEmployeeFilterDropdown() { this.showAllEmployeeOptions.set(true); this.employeeDropdownOpen.update(o => !o); }
  clearNameFilter() { this.filtroNomeRisorsa.setValue(''); this.filtroRisorsaValue.set(''); this.employeeDropdownOpen.set(false); }
  isChanged(): boolean { return this.facade.isChanged(this.workGroupCreateForm, this.originalNameSnapshot) || this.listaRisorseSelezionate().length > 0; }
  get isButtonDisabled(): boolean { return this.workGroupCreateForm.invalid; }


  onCancel() { this.cancel.emit(); }
  onFieldChange() { this.attemptedSubmit = false; this.noChangesMessage = false; this.statusMessage = null; }
  toId(key: string, i: number): string { return toElementId('risorsa', key, i); }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent) {
    const target = event.target as Element | null;
    if (!target?.closest('.resource-name-filter-combo') && !target?.closest('.resource-results')) {
      this.employeeDropdownOpen.set(false);
    }
  }
}