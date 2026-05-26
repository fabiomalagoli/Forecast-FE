import { Component, DestroyRef, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { Role } from '../../../../shared/models/role.model';
import { Employee } from '../../../../shared/models/employee.model';
import { debounceTime, distinctUntilChanged, forkJoin, tap } from 'rxjs';
import { FormsModule, FormControl, NgForm, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EmployeesService } from '../../../../shared/services/employees.service';
import { RolesService } from '../../../../shared/services/roles.service';
import { LookupsService } from '../../../../shared/services/lookups.service';
import { buildEmployeePayload, buildEmployeeUiFallback } from '../../../../shared/payloads/employee.payloads';
import {
    AssignableEmployee,
    getEmployeeFullName,
    isAssignableEmployeeComplete,
    mapAssignedEmployeesToSelected,
} from '../../../../shared/utils/employee-form.utils';
import { toElementId } from '../../../../shared/utils/project-form.utils';

@Component({
  selector: 'app-assegna-risorse',
  templateUrl: './assign-employees.component.html',
  styleUrl: './assign-employees.component.scss',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  standalone: true,
})
export class AssignEmployeeComponent {

    private employeesService = inject(EmployeesService);
    private rolesService = inject(RolesService);
    private lookupsService = inject(LookupsService);
    private destroyRef = inject(DestroyRef);


    selectedRole = input.required<Role>();
    listaRisorseAsssegnate = signal<Employee[]>([]);
    listaRisorseSelezionate = signal<AssignableEmployee[]>([]);


    listaTotaleRisorse = signal<any[]>([]);
    listaJobRolesLevels = signal<any[]>([]);
    isLoadingLookups = signal(false);


    filtroNomeRisorsa = new FormControl('');
    // filtroLivello = new FormControl('');
    filtroRisorsaValue = signal('');
    // filtroLivelloValue = signal('');
    showAllEmployeeOptions = signal(false);
    // showAllLevelOptions = signal(false);
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


    ngOnInit() {
        this.isLoadingLookups.set(true);

        const ra = this.listaRisorseAsssegnate();
        const assignedEmployees = JSON.parse(JSON.stringify(ra)) as Employee[];
        const mappedEmployees = mapAssignedEmployeesToSelected(assignedEmployees)

        this.initialEmployeeState = [...mappedEmployees];

        this.listaRisorseSelezionate.set([...mappedEmployees]);

        const caricamenti = {
            employees: this.employeesService.loadAllEmployees(),
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
        return this.isLoadingLookups() || form.invalid || this.listaRisorseSelezionate().length === 0 || !this.hasValidResources();
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

        if (selectedEmployees.length === 0) {
            this.attemptedSubmit = true;
            this.statusMessage = { text: 'Seleziona almeno una risorsa da assegnare.', type: 'error' };
            return;
        }

        const selectedRole = this.selectedRole();
        const updatedEmployees: Employee[] = selectedEmployees.map((employee) => ({
            ...employee,
            jobRole: selectedRole.name,
            jobRoleLevel: employee.selectedJobRoleLevel,
            company: employee.company,
        }));

        const updateRequests = updatedEmployees.map((employee) =>
            this.employeesService.updateEmployee(
                employee.id,
                buildEmployeePayload(employee, {
                    selectedRoleId: selectedRole.id,
                    levels: this.listaJobRolesLevels(),
                    companies: this.lookupsService.loadedCompanies(),
                }),
                buildEmployeeUiFallback(employee, employee.id),
            )
        );

        forkJoin(updateRequests).subscribe({
            next: () => {
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.statusMessage = { text: 'Risorse assegnate con successo!', type: 'success' };
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
        this.listaRisorseSelezionate.update((selected) =>
            selected.filter((employee) => employee.id !== employeeId)
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
