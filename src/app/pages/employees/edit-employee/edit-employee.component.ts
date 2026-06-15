import { Component, input, output, OnInit, inject, HostListener, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { Employee } from '../../../shared/models/employee.model'; 
import { EmployeesService } from '../../../shared/services/employees.service';
import { ProjectsService } from '../../../shared/services/projects.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { NotifyAction } from '../../../shared/enums/notify.enum';
import { EmployeeFormFacade } from '../../../shared/utils/employee-form.facade';
import { buildEmployeePayload } from '../../../shared/payloads/employee.payloads';
import { toId } from '../../../shared/utils/employee-form.utils';

@Component({
  selector: 'app-edit-employee',
  standalone: true,
  imports: [CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './edit-employee.component.html',
  providers: [EmployeeFormFacade]
})
export class EditEmployeeComponent implements OnInit {
    public facade = inject(EmployeeFormFacade);
    private employeesService = inject(EmployeesService);
    private projectsService = inject(ProjectsService);
    private snackbarService = inject(SnackbarService);
    private cdr = inject(ChangeDetectorRef);

    selectedEmployeeToEdit = input.required<Employee>();

    modified = output<Employee>();
    cancel = output<void>();

    editEmployeeForm!: FormGroup;
    isSaving = signal(false);
    attemptedSubmit = false;
    noChangesMessage = false;
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;


    ngOnInit() {
        const employee = this.selectedEmployeeToEdit();
        this.editEmployeeForm = this.facade.buildForm(employee);

        this.facade.loadAllLookups().subscribe(() => {
            this.facade.originalFormSnapshot.set(JSON.stringify(this.editEmployeeForm.getRawValue()));
            this.cdr.detectChanges();
        });
    }

    get isButtonDisabled(): boolean {
        return this.facade.isButtonDisabled(this.editEmployeeForm, this.isSaving());
    }

    isChanged(): boolean {
        return this.facade.isChanged(this.editEmployeeForm);
    }

    submit() {
        if (this.isButtonDisabled) return;

        this.isSaving.set(true);
        const formValues = this.editEmployeeForm.getRawValue();

        const backendPayload = buildEmployeePayload({ ...formValues }, {
            roles: this.facade.jobRolesList(),
            levels: this.facade.jobRoleLevelsList(),
            companies: this.facade.companiesList(),
        });

        const modifiedEmployee = {
            ...formValues,
            id: this.selectedEmployeeToEdit().id,
        } as Employee;

        this.employeesService.updateEmployeeWithProjectCascade(
            this.selectedEmployeeToEdit().id,
            backendPayload,
            modifiedEmployee,
            this.projectsService
        ).subscribe({
            next: () => {
            this.isSaving.set(false);
            this.attemptedSubmit = false;
            this.noChangesMessage = false;
            this.snackbarService.success(NotifyAction.UpdateEmployee, 'risorsa');
            this.modified.emit(modifiedEmployee);
            this.editEmployeeForm.reset();
            this.cancel.emit();
            },
            error: (error) => {
            this.isSaving.set(false);
            console.error(error);
            this.snackbarService.error(NotifyAction.UpdateEmployee, 'risorsa', 'Chiudi');
            }
        });
    }

    onSubmitClick(event: Event) {
        this.attemptedSubmit = true;
        this.editEmployeeForm.markAllAsTouched();

        if (!this.isChanged()) {
            event.preventDefault();
            this.noChangesMessage = true;
            return;
        }
        if (this.editEmployeeForm.invalid) {
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
        this.editEmployeeForm.get('jobRole')?.setValue(this.facade.optionName(role));
        this.facade.jobRoleDropdownOpen.set(false);
        this.facade.showAllJobRoles.set(false);
        this.onFieldChange();
    }

    clearJobRole() {
        this.editEmployeeForm.get('jobRole')?.setValue('');
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