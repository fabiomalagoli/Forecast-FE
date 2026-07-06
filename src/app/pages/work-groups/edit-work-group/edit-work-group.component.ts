import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { toElementId } from '../../../shared/utils/project-form.utils';
import { WorkGroupFormFacade } from '../../../shared/utils/workgourp-form.facade';
import { WorkGroupsService } from '../../../shared/services/workgroups.service';
import { WorkGroup } from '../../../shared/models/workgroups.model';
import { buildUpdateWorkGroupPayload } from '../../../shared/payloads/workgroup.payloads';
import { AssignableEmployee, getEmployeeFullName } from '../../../shared/utils/employee-form.utils';
import { Employee } from '../../../shared/models/employee.model';
import { EmployeesService } from '../../../shared/services/employees.service';

@Component({
  selector: 'app-modifica-work-group',
  standalone: true,
  imports: [CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './edit-work-group.component.html',
  providers: [WorkGroupFormFacade]
})
export class ModificaWorkGroupComponent {
  public facade = inject(WorkGroupFormFacade);
  private workGroupsService = inject(WorkGroupsService);
  private employeesService = inject(EmployeesService);

  workGroupToEdit = input.required<WorkGroup>();

  modified = output<WorkGroup>();
  cancel = output<void>();

  workGroupEditForm!: FormGroup;

  listaRisorseSelezionate = signal<AssignableEmployee[]>([]);
  listaTotaleRisorse = signal<any[]>([]);
  listaJobRolesLevels = signal<any[]>([]);
  isLoadingLookups = signal(false);

  filtroNomeRisorsa = new FormControl('');
  filtroRisorsaValue = signal('');
  showAllEmployeeOptions = signal(false);
  employeeDropdownOpen = signal(false);

  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  isSaving = signal(false);

  private initialResourcesSnapshot: AssignableEmployee[] = [];

  nameFilterOptions = computed<Employee[]>(() => {
    const term = this.showAllEmployeeOptions() ? '' : this.filtroRisorsaValue();
    const employees = this.listaTotaleRisorse();
    const available = this.listaTotaleRisorse().filter(
      emp => !this.listaRisorseSelezionate().some(sel => sel.id === emp.id)
    );
    if (!term) return available;
    return available.filter(emp => this.fullName(emp).toLowerCase().includes(term));
  });
  
  private originalNameSnapshot = '';

  constructor() {
    effect(() => {
      const role = this.workGroupToEdit();
      if (!role) return;

      this.originalNameSnapshot = role.name || '';

      if (this.workGroupEditForm) {
        this.workGroupEditForm.patchValue({ name: this.originalNameSnapshot }, { emitEvent: false });
      } else {
        this.workGroupEditForm = this.facade.buildForm(this.originalNameSnapshot);
        
        this.workGroupEditForm.valueChanges.subscribe(() => this.resetMessages());
      }
    });
  }

  ngOnInit() {
    this.isLoadingLookups.set(true);
    
    this.employeesService.loadAllEmployees().subscribe({
      next: (allEmployees) => {
        this.listaTotaleRisorse.set(allEmployees);
        this.isLoadingLookups.set(false);

        const gruppo = this.workGroupToEdit();
        if (gruppo && gruppo.employees) {
          const idsAssociati = gruppo.employees.map(e => e.employeeId);
          
          const risorseGiaPresenti = allEmployees
            .filter(emp => idsAssociati.includes(emp.id))
            .map(emp => ({ ...emp, selectedJobRoleLevel: emp.jobRoleLevel || '' }));

          this.listaRisorseSelezionate.set(risorseGiaPresenti);
          this.initialResourcesSnapshot = [...risorseGiaPresenti]; // Salva lo stato per il confronto
        }
      },
      error: () => this.isLoadingLookups.set(false)
    });
  }

  isChanged(): boolean {
    const nameChanged = this.facade.isChanged(this.workGroupEditForm, this.originalNameSnapshot);
    
    const currentList = this.listaRisorseSelezionate();
    const initialList = this.initialResourcesSnapshot;

    if (currentList.length !== initialList.length) {
      return true;
    }

    const currentIds = new Set(currentList.map(e => e.id));
    const resourcesChanged = initialList.some(init => !currentIds.has(init.id));

    return nameChanged || resourcesChanged;
  }

  get isButtonDisabled(): boolean {
    return this.workGroupEditForm.invalid || !this.isChanged() || this.isSaving();
  }

  submit() {
    if (this.isButtonDisabled) return;

    this.isSaving.set(true);
    const formData = {
      name: this.workGroupEditForm.value.name,
      employeeIds: this.listaRisorseSelezionate().map(emp => emp.id)
    };
    
    const groupPayload = buildUpdateWorkGroupPayload(formData, this.workGroupToEdit().id);

    this.workGroupsService.updateWorkGroup(this.workGroupToEdit() ,groupPayload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.statusMessage = { text: 'Gruppo modificato con successo!', type: 'success' };
        this.modified.emit(this.workGroupToEdit());
        this.workGroupEditForm.reset();
        this.cancel.emit();
      },
      error: (error: any) => {
        this.isSaving.set(false);
        this.attemptedSubmit = true;
        let errorMessage = 'Errore durante la modifica del gruppo';
        
        if (error.status === 400) errorMessage = 'Dati non validi. Controlla i campi inseriti.';
        else if (error.status === 404) errorMessage = 'Gruppo non trovato.';
        else if (error.status === 500) errorMessage = 'Errore del server. Riprova più tardi.';
        
        this.statusMessage = { text: errorMessage, type: 'error' };
      }
    });
  }

  onSubmitClick(event: Event) {
    if (!this.isChanged()) {
      event.preventDefault();
      this.noChangesMessage = true;
      return;
    }
    if (this.workGroupEditForm.invalid) {
      event.preventDefault();
      this.attemptedSubmit = true;
      this.workGroupEditForm.markAllAsTouched();
    }
  }

  fullName(employee: Employee): string { return getEmployeeFullName(employee); }
  optionName(option: any): string { return option?.name || option?.Name || option || ''; }

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

  updateSelectedLevel(id: string, level: string) {
    this.listaRisorseSelezionate.update(list =>
      list.map(emp => emp.id === id ? { ...emp, selectedJobRoleLevel: level } : emp)
    );
  }

  removeSelectedResource(id: string) {
    this.listaRisorseSelezionate.update(list => list.filter(emp => emp.id !== id));
  }

  onEmployeeFilterFocus() { this.showAllEmployeeOptions.set(true); this.employeeDropdownOpen.set(true); }
  onEmployeeFilterInput() { this.showAllEmployeeOptions.set(false); this.employeeDropdownOpen.set(true); }
  toggleEmployeeFilterDropdown() { this.showAllEmployeeOptions.set(true); this.employeeDropdownOpen.update(o => !o); }
  clearNameFilter() { this.filtroNomeRisorsa.setValue(''); this.filtroRisorsaValue.set(''); this.employeeDropdownOpen.set(false); }

  onCancel() { this.cancel.emit(); }
  onFieldChange() { this.resetMessages(); }
  toId(key: string, i: number): string { return toElementId('role', key, i); }

  private resetMessages() {
    this.attemptedSubmit = false;
    this.noChangesMessage = false;
    this.statusMessage = null;
  }
}