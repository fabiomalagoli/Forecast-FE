import { Component, input, output, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
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
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './edit-employee.component.html',
  styleUrls: ['../../../shared/form-styles.scss'],
})
export class EditEmployeeComponent implements OnInit {

    private employeesService = inject(EmployeesService);
    private rolesService = inject(RolesService);
    private lookupsService = inject(LookupsService);
    
    selectedEmployeeToEdit = input.required<Employee>();

    modified = output<Employee>();
    cancel = output<void>();

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

    private originalData: string = '';

    readonly headers = (Object.entries(EMPLOYEES_HEADERS) as [keyof Employee, string][])
        .filter(([key]) => key !== 'id' && key !== 'isActive') 
        .map(([key, label]) => ({ key, label }));

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

        this.formData = { ...this.baseData };
        this.originalData = JSON.stringify(this.formData);
    }

    private syncEmployee = effect(() => {
        const emp = this.selectedEmployeeToEdit();
        if (!emp) return;
        
        this.baseData = JSON.parse(JSON.stringify(emp));
        const normalized = normalizeEmployeeForForm(this.baseData);
        
        console.log('Edit Employee: received data:', emp, '-> normalized:', normalized);
        
        this.formData = { ...normalized };
        this.originalData = JSON.stringify(this.formData);
    });

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
            : (this.formData.jobRole || '').toString().trim().toLowerCase();

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
        this.formData.jobRole = this.optionName(role);
        this.jobRoleDropdownOpen.set(false);
        this.showAllJobRoles.set(false);
        this.onFieldChange();
    }

    isChanged(): boolean {
        return JSON.stringify(this.formData) !== this.originalData;
    }

    isSubmitDisabled(form: NgForm): boolean {
        return form.invalid || !this.isChanged();
    }

    submit(form: NgForm) {
        if (form.invalid || !this.isChanged()) {
            return;
        }

        const uiFallback = buildEmployeeUiFallback(this.formData, this.selectedEmployeeToEdit().id);
        const backendPayload = buildEmployeePayload(this.formData, {
            roles: this.jobRolesList(),
            levels: this.jobRoleLevelsList(),
            companies: this.companiesList(),
        });

        this.employeesService.updateEmployee(this.selectedEmployeeToEdit().id, backendPayload, uiFallback).subscribe({
            next: () => {
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.statusMessage = { text: 'Employee successfully updated!', type: 'success' };
                this.modified.emit(uiFallback);
                form.resetForm();
                this.formData = {};
                this.cancel.emit();
            },
            error: (error: any) => {
                this.attemptedSubmit = true;
                let errorMessage = 'Error updating employee.';
                
                if (error.status === 400) {
                    errorMessage = 'Invalid data. Check the input fields.';
                } else if (error.status === 404) {
                    errorMessage = 'Employee not found.';
                } else if (error.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                } else if (error.message) {
                    errorMessage = `Error: ${error.message}`;
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

    onSubmitClick(form: NgForm, event: Event) {
        if (!this.isChanged()) {
            event.preventDefault();
            this.noChangesMessage = true;
            return;
        } 
        if (form.invalid) {
            event.preventDefault();
            this.attemptedSubmit = true;
        }
    }

    onFieldChange() {
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.statusMessage = null;
    }
}
