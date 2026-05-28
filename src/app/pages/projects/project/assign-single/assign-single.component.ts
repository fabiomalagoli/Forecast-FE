import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { AppButtonComponent } from '../../../../shared/button/button';
import { EmployeesService } from '../../../../shared/services/employees.service';
import { RolesService } from '../../../../shared/services/roles.service';
import { buildEmployeePayload, buildEmployeeUiFallback } from '../../../../shared/payloads/employee.payloads';
import { Employee } from '../../../../shared/models/employee.model';
import { Role } from '../../../../shared/models/role.model';
import { Company } from '../../../../shared/models/company.model';

@Component({
  selector: 'app-assign-single',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent],
  templateUrl: './assign-single.component.html',
})
export class AssignSingleComponent {
    private fb = inject(FormBuilder);
    private employeesService = inject(EmployeesService);
    private rolesService = inject(RolesService);

    // Inputs provided by parent
    employees = input.required<Employee[]>();
    roles = input.required<Role[]>();
    levels = input.required<any[]>();
    selectedEmployeeIdFromForm = input<string | null>(null);

    // simple local state
    selectedEmployeeId = signal<string | null>(null);
    selectedRoleId = signal<string | null>(null);
    selectedLevel = signal<string | null>(null);

    assignSingleEmployeeForm!: FormGroup;

    availableRoles = computed(() => 
        this.roles().filter(r => (r?.name || '').toString().trim().toLowerCase() !== 'unassigned')
    );

    saved = output<Employee[]>();
    cancel = output<void>();

    isSaving = signal(false);
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;

    companies = input.required<Company[]>();

    initForm() {
        const formControls: { [key: string]: any } = {};

        this.assignSingleEmployeeForm = this.fb.group(formControls);
    }

    constructor() {
        this.initForm();
        
        // Sincronizza l'ID se il padre lo passa già con valori all'apertura
        effect(() => {
            const initialId = this.selectedEmployeeIdFromForm();
            if (initialId) {
                this.selectedEmployeeId.set(initialId);
                this.chooseEmployee();
            }
        });
    }

    ngOnInit() {
        console.log('AssignSingleComponent initialized with employees:', this.employees());
    }

    chooseEmployee() {
        if (!this.selectedEmployeeId()) return;
        
        const e = (this.employees() || []).find(x => String(x.id) === String(this.selectedEmployeeId()));
        if (e) {
            this.selectedLevel.set(e.jobRoleLevel || null);
            
            const matchingRole = this.roles().find(r => 
                String(r.id) === String(e.jobRole) || 
                r.name.toLowerCase() === String(e.jobRole).toLowerCase()
            );
            
            this.selectedRoleId.set(matchingRole ? matchingRole.id : null);
        }
    }

    save() {
        const empId = this.selectedEmployeeId();
        if (!empId) return;
        const emp = (this.employees() || []).find(x => String(x.id) === String(empId));
        if (!emp) return;

        const roleId = this.selectedRoleId();
        const level = this.selectedLevel() || 'Junior';

        this.isSaving.set(true);

        const payload = buildEmployeePayload({ ...emp, jobRoleLevel: level, jobRole: roleId }, {
            selectedRoleId: roleId,
            levels: this.levels(),
            companies: this.companies(),
        });

        const uiFallback = buildEmployeeUiFallback({ ...emp, jobRole: roleId ? (this.roles().find(r => String(r.id) === String(roleId))?.name || '') : '', jobRoleLevel: level }, emp.id);

        this.employeesService.updateEmployee(emp.id, payload, uiFallback).subscribe({
            next: () => {
            this.isSaving.set(false);
            this.statusMessage = { text: 'Ruolo aggiornato', type: 'success' };
            this.saved.emit([ { ...emp, jobRole: uiFallback.jobRole, jobRoleLevel: uiFallback.jobRoleLevel } as Employee ]);
            },
            error: () => {
            this.isSaving.set(false);
            this.statusMessage = { text: 'Errore durante l\'aggiornamento', type: 'error' };
            }
        });
    }

    doCancel() {
        this.cancel.emit();
    }
}
