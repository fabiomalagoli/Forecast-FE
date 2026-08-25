import { Component, HostListener, OnInit, inject, output, signal, ChangeDetectorRef, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Employee } from '../../../shared/models/employee.model'; 
import { EmployeesService } from '../../../shared/services/employees.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { NotifyAction } from '../../../shared/enums/notify.enum';
import { EmployeeFormFacade } from '../../../shared/utils/employee-form.facade';
import { buildEmployeePayload } from '../../../shared/payloads/employee.payloads';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { toId } from '../../../shared/utils/employee-form.utils';
import { EntityPermissionsService } from '../../../shared/services/permissions.service';

@Component({
  selector: 'app-new-employee',
  standalone: true,
  imports: [CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './new-employee.component.html',
  providers: [EmployeeFormFacade]
})
export class NewRisorsaComponent implements OnInit {
    public facade = inject(EmployeeFormFacade);
    private employeesService = inject(EmployeesService);
    private snackbarService = inject(SnackbarService);
    private permissionsService = inject(EntityPermissionsService);
    private cdr = inject(ChangeDetectorRef);

    selectedEmployeeToAdd = input.required<Employee | null>();

    added = output<Employee>();
    cancel = output<void>();

    createEmployeeForm!: FormGroup;
    isSaving = signal(false);
    attemptedSubmit = false;
    noChangesMessage = false;
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;

    constructor() {
        this.createEmployeeForm = this.facade.buildForm();
    }

    ngOnInit() {
        this.facade.loadAllLookups().subscribe(() => {
            const employee = this.selectedEmployeeToAdd();
            if (employee) {
            this.createEmployeeForm.patchValue(employee);
            }
            
            this.facade.originalFormSnapshot.set(JSON.stringify(this.createEmployeeForm.getRawValue()));
            this.cdr.detectChanges();
        });
    }

    get isButtonDisabled(): boolean {
        return this.facade.isButtonDisabled(this.createEmployeeForm, this.isSaving());
    }

    isChanged(): boolean {
        return this.facade.isChanged(this.createEmployeeForm);
    }

    submit() {
        if (!this.permissionsService.canEditGlobal() || this.isButtonDisabled) return;

        this.isSaving.set(true);
        const formValues = this.createEmployeeForm.getRawValue();

        const backendPayload = buildEmployeePayload({ ...formValues }, {
            roles: this.facade.jobRolesList(),
            levels: this.facade.jobRoleLevelsList(),
            companies: this.facade.companiesList(),
        });

        const createdEmployee = { ...formValues } as Employee;

        this.employeesService.addEmployee(backendPayload).subscribe({
            next: () => {
            this.isSaving.set(false);
            this.attemptedSubmit = false;
            this.noChangesMessage = false;
            this.snackbarService.success(NotifyAction.Creazione, 'risorsa');
            this.added.emit(createdEmployee);
            this.createEmployeeForm.reset();
            this.cancel.emit();
            },
            error: (error) => {
            this.isSaving.set(false);
            console.error(error);
            this.snackbarService.error(NotifyAction.Creazione, 'risorsa', 'Chiudi');
            }
        });
    }

    onSubmitClick(event: Event) {
        this.attemptedSubmit = true;
        this.createEmployeeForm.markAllAsTouched();

        if (!this.isChanged()) {
            event.preventDefault();
            this.noChangesMessage = true;
            return;
        }
        if (this.createEmployeeForm.invalid) {
            event.preventDefault();
        }
    }

    getOptions(key: string): any[] {
        switch (key) {
            case 'jobRoleLevel': return this.facade.jobRoleLevelsList();
            case 'company': return this.facade.companiesList();
            default: return [];
        }
    }

    onJobRoleInput() { this.facade.showAllJobRoles.set(false); this.facade.jobRoleDropdownOpen.set(true); this.onFieldChange(); }
    onJobRoleFocus() { this.facade.showAllJobRoles.set(true); this.facade.jobRoleDropdownOpen.set(true); }
    toggleJobRoleDropdown() { this.facade.showAllJobRoles.set(true); this.facade.jobRoleDropdownOpen.update((open) => !open); }

    selectJobRole(role: any) {
        this.createEmployeeForm.get('jobRole')?.setValue(this.facade.optionName(role));
        this.facade.jobRoleDropdownOpen.set(false);
        this.facade.showAllJobRoles.set(false);
        this.onFieldChange();
    }

    clearJobRole() {
        this.createEmployeeForm.get('jobRole')?.setValue('');
        this.facade.jobRoleDropdownOpen.set(false);
        this.facade.showAllJobRoles.set(false);
        this.onFieldChange();
    }

    onCancel() { this.cancel.emit(); }
    onFieldChange() { this.attemptedSubmit = false; this.noChangesMessage = false; }

    toId(key: string, i: number): string {
        return toId('risorsa', key, i);
    }

    @HostListener('document:mousedown', ['$event'])
        onDocumentMouseDown(event: MouseEvent) {
        if (!(event.target as Element | null)?.closest('.combo-field')) {
            this.facade.jobRoleDropdownOpen.set(false);
            this.facade.showAllJobRoles.set(false);
        }
    }
}