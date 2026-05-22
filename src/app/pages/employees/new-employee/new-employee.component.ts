import { Component, input, output, OnInit, inject, signal, effect, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { Employee } from '../../../shared/models/employee.model'; 
import { EMPLOYEES_HEADERS } from '../employee.headers'; 
import { EmployeesService } from '../../../shared/services/employees.service';
import { RolesService } from '../../../shared/services/roles.service';
import { LookupsService } from '../../../shared/services/lookups.service';
import { buildEmployeePayload, buildEmployeeUiFallback } from '../../../shared/payloads/employee.payloads';
import { normalizeEmployeeForForm } from '../../../shared/utils/employee-form.utils';
import { toElementId } from '../../../shared/utils/project-form.utils';

@Component({
  selector: 'app-new-employee',
  imports: [FormsModule, CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './new-employee.component.html',
})
export class NewRisorsaComponent implements OnInit {

    private employeesService = inject(EmployeesService);
    private rolesService = inject(RolesService);
    private lookupsService = inject(LookupsService);
    private fb = inject(FormBuilder);
    
    // Input dal componente padre (RisorseComponent)
    selectedEmployeeToAdd = input.required<Employee | null>();

    // Output verso il componente padre
    added = output<Employee>();
    cancel = output<void>();

    createEmployeeForm!: FormGroup;

    // Variabili per gestione stato del form e messaggi
    attemptedSubmit = false;
    noChangesMessage = false;
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;
    dateRangeError = false;
    formData: any = {};
    baseData: any = {};

    // Segnali per i menu a tendina
    jobRolesList = signal<any[]>([]);
    jobRoleLevelsList = signal<any[]>([]);
    companiesList = signal<any[]>([]);
    jobRoleDropdownOpen = signal(false);
    showAllJobRoles = signal(false);

    // Variabile per memorizzare i dati originali, utile per verificare se ci sono state modifiche
    private originalDataToCompare: any = {};

    // Headers dinamici basati su RISORSE_HEADERS, escludendo campi non editabili come 'id' e 'isActive'
    readonly headers = (Object.entries(EMPLOYEES_HEADERS) as [keyof Employee, string][])
        .filter(([key]) => key !== 'id' && key !== 'isActive') 
        .map(([key, label]) => ({ key, label }));

    initForm() {
        const employee = this.selectedEmployeeToAdd();

        this.originalDataToCompare = {...employee};

        const formControls: { [key: string]: any } = {};

        this.headers.forEach(header => {
            const initialValue = this.originalDataToCompare[header.key as keyof typeof this.originalDataToCompare] || '';
            formControls[header.key] = [initialValue, Validators.required];
        });

        this.createEmployeeForm = this.fb.group(formControls);
    }

    ngOnInit() {
        const caricamenti = [
            this.rolesService.loadAllJobRoles(),
            this.rolesService.loadJobRoleLevels(),
            this.lookupsService.loadAvailableCompanies()
        ];

        forkJoin(caricamenti).subscribe({
            next: (risultati) => {
                this.jobRolesList.set(risultati[0]);
                this.jobRoleLevelsList.set(risultati[1]);
                this.companiesList.set(risultati[2]);
            }, 
            error: (error) => {
                this.statusMessage = { text: 'Errore durante il caricamento dei dati: ' + error.message, type: 'error' };
            }
        });

        this.initForm();

    }

    getOptions(key: string): any[] {
        switch (key) {
            case 'jobRole': return this.jobRolesList();
            case 'jobRoleLevel': return this.jobRoleLevelsList();
            case 'company': return this.companiesList();
            default: return [];
        }
    }

    optionName(opt: any): string {
        return opt?.name || opt?.Name || opt || '';
    }

    getFilteredJobRoles(): any[] {
        const term = this.showAllJobRoles()
            ? ''
            : (this.createEmployeeForm.get('jobRole')?.value || '').toString().trim().toLowerCase();

        if (!term) {
            return this.jobRolesList();
        }

        return this.jobRolesList().filter((role) =>
            this.optionName(role).toLowerCase().includes(term)
        );
    }

    onJobRoleInput() {
        this.showAllJobRoles.set(false);
        this.jobRoleDropdownOpen.set(true);
        this.onFieldChange();
    }

    onJobRoleFocus() {
        this.showAllJobRoles.set(true);
        this.jobRoleDropdownOpen.set(true);
    }

    toggleJobRoleDropdown() {
        this.showAllJobRoles.set(true);
        this.jobRoleDropdownOpen.update((open) => !open);
    }

    selectJobRole(role: any) {
        this.createEmployeeForm.get('jobRole')?.setValue(this.optionName(role));
        this.jobRoleDropdownOpen.set(false);
        this.showAllJobRoles.set(false);
        this.onFieldChange();
    }

    clearJobRole() {
        this.createEmployeeForm.get('jobRole')?.setValue('');
        this.jobRoleDropdownOpen.set(false);
        this.showAllJobRoles.set(false);
        this.onFieldChange();
    }

    isChanged(): boolean {
        if(!this.createEmployeeForm) return false;

        const currentValues = this.createEmployeeForm.getRawValue();

        for(const key of Object.keys(currentValues)) {
            const currentValue = currentValues[key] == null ? '' : String(currentValues[key]).trim();
            const originalValue = this.originalDataToCompare[key] == null ? '' : String(this.originalDataToCompare[key]).trim();

            if(currentValue != originalValue) {
                return true;
            }
        }
        return false;
    }

    isSubmitDisabled(): boolean {
        return this.createEmployeeForm.invalid || !this.isChanged();
    }

    submit() {
        if (this.createEmployeeForm.invalid || !this.isChanged()) {
            return;
        }

        const backendPayload = buildEmployeePayload({...this.createEmployeeForm.value}, {
            roles: this.jobRolesList(),
            levels: this.jobRoleLevelsList(),
            companies: this.companiesList(),
        });

        const createdEmployee = {...this.createEmployeeForm.value} as Employee;

        this.employeesService.addEmployee(backendPayload).subscribe({
            next: () => {
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.statusMessage = { text: 'Risorsa aggiunta con successo!', type: 'success' };
                this.added.emit(createdEmployee);
                this.createEmployeeForm.reset();
                this.cancel.emit();
            },
            error: (error: any) => {
                this.attemptedSubmit = true;
                let errorMessage = 'Errore durante l\'aggiunta della risorsa';
                
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
    
    toId(key: string, i: number): string {
        return toElementId('risorsa', key, i);
    }

    isRequiredField(key: string): boolean {
        return key === 'name' || key === 'surname' || key === 'jobRole' || key === 'jobRoleLevel' || key === 'company';
    }

    getRequiredErrorMessage(key: string): string {
        const messages: Record<string, string> = {
            name: 'Nome obbligatorio',
            surname: 'Cognome obbligatorio'
        };
        return messages[key] || 'Campo obbligatorio';
    }

    onSubmitClick(event: Event) {
        if (!this.isChanged()) {
            event.preventDefault();
            this.noChangesMessage = true;
            return;
        } 
        if (this.createEmployeeForm.invalid) {
            event.preventDefault();
            this.attemptedSubmit = true;
            this.createEmployeeForm.markAllAsTouched();
        }
    }

    onFieldChange() {
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.statusMessage = null;
    }

    @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent) {
        const target = event.target as Element | null;

        if (!target?.closest('.combo-field')) {
            this.jobRoleDropdownOpen.set(false);
            this.showAllJobRoles.set(false);
        }

    }
}
