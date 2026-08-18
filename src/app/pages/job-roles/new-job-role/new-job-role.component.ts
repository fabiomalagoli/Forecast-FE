import { Component, inject, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { JobRolesService } from '../../../shared/services/job-roles.service';
import { JobRole } from '../../../shared/models/job-role.model';
import { buildCreateJobRolePayload } from '../../../shared/payloads/job-role.payloads';
import { JobRoleFormFacade } from '../../../shared/utils/job-role-form.facade';
import { toElementId } from '../../../shared/utils/project-form.utils';

@Component({
  selector: 'app-new-job-role',
  standalone: true,
  imports: [CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './new-job-role.component.html',
  providers: [JobRoleFormFacade]
})
export class NewJobRoleComponent {
  public facade = inject(JobRoleFormFacade);
  private rolesService = inject(JobRolesService);

  roleToAdd = input.required<JobRole | null>();

  added = output<void>();
  cancel = output<void>();

  roleCreateForm!: FormGroup;

  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  
  private originalNameSnapshot = '';

  constructor() {
    this.roleCreateForm = this.facade.buildForm();

    effect(() => {
      const r = this.roleToAdd();
      if (!r) return;
      
      const roleName = r.name || '';
      this.roleCreateForm.patchValue({ name: roleName }, { emitEvent: false });
      this.originalNameSnapshot = roleName;
    });
  }

  isChanged(): boolean {
    return this.facade.isChanged(this.roleCreateForm, this.originalNameSnapshot);
  }

  get isButtonDisabled(): boolean {
    return this.roleCreateForm.invalid || !this.isChanged();
  }

  submit() {
    if (this.isButtonDisabled) return;

    const payload = buildCreateJobRolePayload({ 
      ...this.roleToAdd(), 
      ...this.roleCreateForm.value 
    });

    this.rolesService.addJobRole(payload).subscribe({
      next: () => {
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.added.emit();
        this.roleCreateForm.reset();
        this.cancel.emit();
      },
      error: (error: any) => {
        this.attemptedSubmit = true;
        let errorMessage = "Errore durante l'aggiunta del ruolo";
        if (error.status === 400) errorMessage = 'Dati non validi.';
        if (error.status === 409) errorMessage = 'Il ruolo esiste già.';
        
        this.statusMessage = { text: errorMessage, type: 'error' };
      }
    });
  }

  onSubmitClick(event: Event) {
    if (!this.isChanged()) {
      event.preventDefault();
      this.roleCreateForm.markAllAsTouched();
      this.noChangesMessage = true;
      return;
    } 
    if (this.roleCreateForm.invalid) {
      event.preventDefault();
      this.attemptedSubmit = true;
      this.roleCreateForm.markAllAsTouched();
    }
  }

  onCancel() { this.cancel.emit(); }
  onFieldChange() { this.attemptedSubmit = false; this.noChangesMessage = false; this.statusMessage = null; }
  toId(key: string, i: number): string { return toElementId('risorsa', key, i); }
}