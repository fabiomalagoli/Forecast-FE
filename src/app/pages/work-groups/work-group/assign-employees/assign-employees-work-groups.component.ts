import { Component, DestroyRef, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import { Employee } from '../../../../shared/models/employee.model';
import { debounceTime, distinctUntilChanged, forkJoin, Observable, tap } from 'rxjs';
import { FormsModule, FormControl, NgForm, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EmployeesService } from '../../../../shared/services/employees.service';
import { ProjectsService } from '../../../../shared/services/projects.service';
import { JobRolesService } from '../../../../shared/services/job-roles.service';
import { LookupsService } from '../../../../shared/services/lookups.service';
import { buildUpdateWorkGroupPayload } from '../../../../shared/payloads/workgroup.payloads';
import {
    AssignableEmployee,
    getEmployeeFullName,
    isAssignableEmployeeComplete,
    mapAssignedEmployeesToSelected,
} from '../../../../shared/utils/employee-form.utils';
import { toElementId } from '../../../../shared/utils/project-form.utils';
import { WorkGroup } from '../../../../shared/models/workgroup.model';
import { WorkGroupsService } from '../../../../shared/services/workgroups.service';

@Component({
  selector: 'app-assegna-risorse-gruppi',
  templateUrl: './assign-employees-work-groups.component.html',
  styleUrl: './assign-employees-work-groups.component.scss',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  standalone: true,
})
export class AssignEmployeeComponent {

    private employeesService = inject(EmployeesService);
    private projectsService = inject(ProjectsService);
    private rolesService = inject(JobRolesService);
    private lookupsService = inject(LookupsService);
    private workGroupsService = inject(WorkGroupsService);
    private destroyRef = inject(DestroyRef);
    private initializedState = false;


    selectedWorkGroup = input.required<WorkGroup>();
    listaRisorseAssegnate = input.required<Employee[]>();
    listaRisorseSelezionate = signal<AssignableEmployee[]>([]);


    listaTotaleRisorse = signal<any[]>([]);
    listaJobRolesLevels = signal<any[]>([]);
    isLoadingLookups = signal(false);


    filtroNomeRisorsa = new FormControl('');
    filtroRisorsaValue = signal('');
    showAllEmployeeOptions = signal(false);
    employeeDropdownOpen = signal(false);

    fullName(employee: Employee): string {
        return getEmployeeFullName(employee);
    }

    nameFilterOptions = computed<Employee[]>(() => {
        const term = this.showAllEmployeeOptions() ? '' : this.filtroRisorsaValue();
        const employees = this.listaTotaleRisorse();
        const selectedIds = new Set(this.listaRisorseSelezionate().map((employee) => employee.id));
        const availableEmployees = employees.filter((employee) => !selectedIds.has(employee.id));

        if (!term) {
            return availableEmployees;
        }

        return availableEmployees.filter(employee =>
            this.fullName(employee).toLowerCase().includes(term)
        );
    });


    saved = output<Employee[]>();
    cancel = output<void>();


    attemptedSubmit = false;
    noChangesMessage = false;
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;
    dateRangeError = false;

    private initialEmployeeState: AssignableEmployee[] = [];

    constructor() {
        effect(() => {
            const ra = this.listaRisorseAssegnate();
            if (!this.initializedState && ra) {
                const assignedEmployees = JSON.parse(JSON.stringify(ra)) as Employee[];
                const mappedEmployees = mapAssignedEmployeesToSelected(assignedEmployees);

                this.initialEmployeeState = [...mappedEmployees];
                this.listaRisorseSelezionate.set([...mappedEmployees]);
                
                // Blocca l'effetto per tutta la durata di vita del component
                this.initializedState = true; 
            }
        });
    }

    ngOnInit() {
        this.isLoadingLookups.set(true);

        const caricamenti = {
            employees: this.employeesService.loadAllEmployees(),
            roles: this.rolesService.loadAllJobRoles(),
            levels: this.rolesService.loadJobRoleLevels(),
            companies: this.lookupsService.loadAvailableCompanies(),
        };

        forkJoin(caricamenti).subscribe({
            next: (risultati) => {
                this.listaTotaleRisorse.set(risultati.employees);
                this.listaJobRolesLevels.set(risultati.levels);
                this.isLoadingLookups.set(false);
            },
            error: (error) => {
                this.isLoadingLookups.set(false);
                this.statusMessage = {
                    text: 'Errore durante il caricamento dei dati necessari: ' + error.message,
                    type: 'error',
                };
            },
        })

        const filterSubscription = this.filtroNomeRisorsa.valueChanges.pipe(
            debounceTime(250),
            distinctUntilChanged(),
            tap(value => {
                this.filtroRisorsaValue.set((value || '').toLowerCase());
                this.showAllEmployeeOptions.set(false);
            })
        ).subscribe();

        this.destroyRef.onDestroy(() => {
            filterSubscription.unsubscribe();
        });

    }

    onEmployeeFilterFocus() {
        this.showAllEmployeeOptions.set(true);
        this.employeeDropdownOpen.set(true);
    }

    onEmployeeFilterInput() {
        this.showAllEmployeeOptions.set(false);
        this.employeeDropdownOpen.set(true);
    }

    toggleEmployeeFilterDropdown() {
        this.showAllEmployeeOptions.set(true);
        this.employeeDropdownOpen.update(open => !open);
    }

    selectEmployeeFilter(employee: Employee) {
        const alreadySelected = this.listaRisorseSelezionate().some((selected) => selected.id === employee.id);

        if (!alreadySelected) {
            this.listaRisorseSelezionate.update((selected) => [
                ...selected,
                {
                    ...employee,
                    selectedJobRoleLevel: employee.jobRoleLevel || '',
                },
            ]);
        }

        this.filtroNomeRisorsa.setValue('');
        this.filtroRisorsaValue.set('');
        this.employeeDropdownOpen.set(false);
        this.showAllEmployeeOptions.set(false);
        this.onFieldChange();
    }

    clearNameFilter() {
        this.filtroNomeRisorsa.setValue('');
        this.filtroRisorsaValue.set('');
        this.employeeDropdownOpen.set(false);
        this.showAllEmployeeOptions.set(false);
    }

    isChanged(): boolean {
        const currentList = this.listaRisorseSelezionate();
        const initialList = this.initialEmployeeState;

        if(currentList.length !== initialList.length) {
            return true;
        }

        const currentMap = new Map(currentList.map(emp => [emp.id, emp.selectedJobRoleLevel]))
        for(const initialEmp of initialList) {
            if(!currentMap.has(initialEmp.id)){
                return true;
            }
            if(currentMap.get(initialEmp.id) !== initialEmp.selectedJobRoleLevel) {
                return true;
            }
        }
        return false;

    }

    hasValidResources(): boolean {
        const risorse = this.listaRisorseSelezionate();
        if (!risorse || risorse.length === 0) return true;
        return risorse.every((resource) => isAssignableEmployeeComplete(resource));
    }

    isSubmitDisabled(form: NgForm): boolean {
        // Disabilita il submit se il form è invalido, se i lookup sono in caricamento o se le risorse non sono complete
        if (this.isLoadingLookups() || form.invalid || !this.hasValidResources()) return true;
        // Permetti il submit solo se ci sono cambiamenti rispetto allo stato iniziale
        return !this.isChanged();
    }

    onSubmitClick(form: NgForm, event: Event) {
        // Se non ci sono cambiamenti, blocchiamo il submit e mostriamo un messaggio
        if (!this.isChanged()) {
        event.preventDefault();
        this.noChangesMessage = true;
        return;
        }

        if (form.invalid || !this.hasValidResources()) {
        // Se il form è invalido o i ruoli non sono completi, blocchiamo il submit e mostriamo un messaggio
        event.preventDefault();
        this.attemptedSubmit = true;
        }
    }
    
    submit(form: NgForm) {
        if (form.invalid) {
            return;
        }
        const selectedEmployees = this.listaRisorseSelezionate();

        const selectedGroup = this.selectedWorkGroup();
        const selectedGroupId = selectedGroup.id;

        const RemainingEmployeesIds = selectedEmployees.map(emp => emp.id);

        const workGroupPayload = buildUpdateWorkGroupPayload({
            name: selectedGroup.name,
            employeeIds: RemainingEmployeesIds
        }, selectedGroupId)

        // Employees da aggiornare localmente con i nuovi valori di jobRole e jobRoleLevel ed assegnare
        const updatedEmployees: Employee[] = selectedEmployees.map((employee) => ({
            ...employee,
            jobRole: selectedGroup.name,
            jobRoleLevel: employee.selectedJobRoleLevel,
            company: employee.company,
        }));

        this.workGroupsService.updateWorkGroup(selectedGroup, workGroupPayload).subscribe({
            next: () => {
                    this.saved.emit(updatedEmployees);
                    form.resetForm();
                    this.cancel.emit();
            },
            error: (error: any) => {
                this.attemptedSubmit = true;
                let errorMessage = 'Errore durante la modifica della risorsa';

                if (error.status === 400) {
                    errorMessage = 'Dati non validi. Controlla i campi inseriti.';
                } else if (error.status === 404) {
                    errorMessage = 'Risorsa non trovata.';
                } else if (error.status === 500) {
                    errorMessage = 'Errore del server. Riprova più tardi.';
                } else if (error.message) {
                    errorMessage = `Errore: ${error.message}`;
                }

                this.statusMessage = { text: errorMessage, type: 'error' };
            }
        });
    }

    onCancel() {
        this.cancel.emit();
    }

    removeSelectedResource(employeeId: string) {
        const idStr = String(employeeId);

        const currentSelected = this.listaRisorseSelezionate();
        let employee = currentSelected.find(e => String(e.id) === idStr) as Employee | undefined;
        if (!employee) {
            employee = (this.listaTotaleRisorse() || []).find(e => String(e.id) === idStr) as Employee | undefined;
        }

        // Se ci sono Employees con 'Unassigned' role, segnali come tali con Junior level come default
        const allRoles = this.rolesService.loadedAllJobRoles?.() || [];
        const foundUnassigned = allRoles.find(r => (r?.name || '').toString().trim().toLowerCase() === 'unassigned');

        if (employee) {
            if (foundUnassigned && foundUnassigned.id) {
                const localUpdate = { ...employee, jobRole: foundUnassigned.id, jobRoleLevel: 'Junior' } as Employee;
                this.employeesService.updateEmployeeLocal(localUpdate);
            } else {
                const localUpdate = { ...employee, jobRole: '', jobRoleLevel: 'Junior' } as Employee;
                this.employeesService.updateEmployeeLocal(localUpdate);
            }
        }

        this.listaRisorseSelezionate.update((selected) =>
            selected.filter((emp) => String(emp.id) !== idStr)
        );

        this.onFieldChange();
    }

    updateSelectedLevel(employeeId: string, level: string) {
        this.listaRisorseSelezionate.update((selected) =>
            selected.map((employee) =>
                employee.id === employeeId
                    ? { ...employee, selectedJobRoleLevel: level }
                    : employee
            )
        );
        this.onFieldChange();
    }

    getOptions(key: string): any[] {
        switch (key) {
            case 'jobRoleLevel': return this.listaJobRolesLevels();
            case 'employees': return this.listaTotaleRisorse();
            default: return [];
        }
    }

    toId(key: string, i: number): string {
        return toElementId('risorsa', key, i);
    }

    getRequiredErrorMessage(key: string): string {
        const messages: Record<string, string> = {
            name: 'Nome obbligatorio',
            surname: 'Cognome obbligatorio'
        };
        return messages[key] || 'Campo obbligatorio';
    }


    onFieldChange() {
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.statusMessage = null;
    }

    optionName(option: any): string {
        return option?.name || option?.Name || option || '';
    }

    @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent) {
        const target = event.target as Element | null;

        if (!target?.closest('.resource-name-filter-combo') && !target?.closest('.resource-dropdown') && !target?.closest('.resource-results')) {
            this.employeeDropdownOpen.set(false);
            this.showAllEmployeeOptions.set(false);
        }
    }

}
