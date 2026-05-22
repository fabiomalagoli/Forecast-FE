import { Component, input, output, OnInit, inject, signal, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { Employee } from '../../../shared/models/employee.model'; 
import { EMPLOYEES_HEADERS } from '../employee.headers'; 
import { RolesService } from '../../../shared/services/roles.service';
import { LookupsService } from '../../../shared/services/lookups.service';
import { EmployeesService } from '../../../shared/services/employees.service';
import { buildEmployeePayload, buildEmployeeUiFallback } from '../../../shared/payloads/employee.payloads';
import { normalizeEmployeeForForm } from '../../../shared/utils/employee-form.utils';
import { toElementId } from '../../../shared/utils/project-form.utils';

@Component({
  selector: 'app-edit-employee',
  imports: [FormsModule, CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './edit-employee.component.html',
})
export class EditEmployeeComponent implements OnInit {

    private employeesService = inject(EmployeesService);
    private rolesService = inject(RolesService);
    private lookupsService = inject(LookupsService);
    private fb = inject(FormBuilder);
    
    selectedEmployeeToEdit = input.required<Employee>();

    modified = output<Employee>();
    cancel = output<void>();

    editEmployeeForm!: FormGroup;

    attemptedSubmit = false;
    noChangesMessage = false;
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;
    dateRangeError = false;
    formData: any = {};
    baseData: any = {};

    // Segnali per le Combo Box
    jobRolesList = signal<any[]>([]);
    jobRoleLevelsList = signal<any[]>([]);
    companiesList = signal<any[]>([]);
    jobRoleDropdownOpen = signal(false);
    showAllJobRoles = signal(false);

    private originalDataToCompare: any = {};

    readonly headers = (Object.entries(EMPLOYEES_HEADERS) as [keyof Employee, string][])
        .filter(([key]) => key !== 'id' && key !== 'isActive') 
        .map(([key, label]) => ({ key, label }));

    initForm() {
        const employee = this.selectedEmployeeToEdit();

        this.originalDataToCompare = {...employee};

        const formControls: { [key: string]: any } = {};

        this.headers.forEach(header => {
            const initialValue = this.originalDataToCompare[header.key as keyof typeof this.originalDataToCompare] || '';
            formControls[header.key] = [initialValue, Validators.required];
        });

        this.editEmployeeForm = this.fb.group(formControls);
    }

    ngOnInit() {
        const loadings = [
            this.rolesService.loadAllJobRoles(),
            this.rolesService.loadJobRoleLevels(),
            this.lookupsService.loadAvailableCompanies()
        ];

        forkJoin(loadings).subscribe({
            next: (results) => {
                this.jobRolesList.set(results[0]);
                this.jobRoleLevelsList.set(results[1]);
                this.companiesList.set(results[2]);
            }, 
            error: (error) => {
                this.statusMessage = { text: 'Error loading data: ' + error.message, type: 'error' };
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
            : (this.editEmployeeForm.get('jobRole')?.value || '').toString().trim().toLowerCase();

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
        this.editEmployeeForm.get('jobRole')?.setValue(this.optionName(role));
        this.jobRoleDropdownOpen.set(false);
        this.showAllJobRoles.set(false);
        this.onFieldChange();
    }

    clearJobRole() {
        this.editEmployeeForm.get('jobRole')?.setValue('');
        this.jobRoleDropdownOpen.set(false);
        this.showAllJobRoles.set(false);
        this.onFieldChange();
    }

    isChanged(): boolean {
        if(!this.editEmployeeForm) return false;

        const currentValues = this.editEmployeeForm.getRawValue();

        for(const key of Object.keys(currentValues)) {
            const currentValue = currentValues[key] == null ? '' : String(currentValues[key]).trim();
            const originalValue = this.originalDataToCompare[key] == null ? '' : String(this.originalDataToCompare[key]).trim();

            if(currentValue !== originalValue) {
                return true;
            }
        }
        return false;
    }

    isSubmitDisabled(): boolean {
        return this.editEmployeeForm.invalid || !this.isChanged();
    }

    submit() {
        if (this.editEmployeeForm.invalid || !this.isChanged()) {
            return;
        }

        const backendPayload = buildEmployeePayload({...this.editEmployeeForm.value}, {
            roles: this.jobRolesList(),
            levels: this.jobRoleLevelsList(),
            companies: this.companiesList(),
        });

        const modifiedEmployee = {...this.editEmployeeForm.value} as Employee;

        this.employeesService.updateEmployee(this.selectedEmployeeToEdit().id, backendPayload, modifiedEmployee).subscribe({
            next: () => {
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.statusMessage = { text: 'Risorsa aggiunta con successo!', type: 'success' };
                this.modified.emit(modifiedEmployee);
                this.editEmployeeForm.reset();
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
        return toElementId('employee', key, i);
    }

    isRequiredField(key: string): boolean {
        return key === 'name' || key === 'surname' || key === 'jobRole' || key === 'jobRoleLevel' || key === 'company';
    }

    getRequiredErrorMessage(key: string): string {
        const messages: Record<string, string> = {
            name: 'Name is required',
            surname: 'Surname is required'
        };
        return messages[key] || 'Field is required';
    }

    onSubmitClick(event: Event) {
        if (!this.isChanged()) {
            event.preventDefault();
            this.noChangesMessage = true;
            return;
        } 
        if (this.editEmployeeForm.invalid) {
            event.preventDefault();
            this.attemptedSubmit = true;
            this.editEmployeeForm.markAllAsTouched();
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
