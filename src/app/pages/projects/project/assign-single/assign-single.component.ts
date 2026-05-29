import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { AppButtonComponent } from '../../../../shared/button/button';
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

        const roleName = roleId ? (this.roles().find(r => String(r.id) === String(roleId))?.name || '') : '';
        const updatedEmployee = { ...emp, jobRole: roleName, jobRoleLevel: level } as Employee;

        this.statusMessage = { text: 'Ruolo pronto per il salvataggio', type: 'success' };
        this.saved.emit([updatedEmployee]);
    }

    doCancel() {
        this.cancel.emit();
    }
}
