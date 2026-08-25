import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { JobRole } from '../../../shared/models/job-role.model';
import { JobRolesService } from '../../../shared/services/job-roles.service';
import { buildUpdateJobRolePayload } from '../../../shared/payloads/job-role.payloads';
import { JobRoleFormFacade } from '../../../shared/utils/job-role-form.facade';
import { toElementId } from '../../../shared/utils/project-form.utils';
import { EntityPermissionsService } from '../../../shared/services/permissions.service';

@Component({
  selector: 'app-modifica-job-role',
  standalone: true,
  imports: [CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './edit-job-role.component.html',
  providers: [JobRoleFormFacade]
})
export class ModificaJobRoleComponent {
  public facade = inject(JobRoleFormFacade);
  private rolesService = inject(JobRolesService);
  private permissionsService = inject(EntityPermissionsService);

  roleToEdit = input.required<JobRole>();

  modified = output<JobRole>();
  cancel = output<void>();

  roleEditForm!: FormGroup;

  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  isSaving = signal(false);

  private originalNameSnapshot = '';

  constructor() {
    effect(() => {
      const role = this.roleToEdit();
      if (!role) return;

      this.originalNameSnapshot = role.name || '';

      if (this.roleEditForm) {
        this.roleEditForm.patchValue({ name: this.originalNameSnapshot }, { emitEvent: false });
      } else {
        this.roleEditForm = this.facade.buildForm(this.originalNameSnapshot);
        
        this.roleEditForm.valueChanges.subscribe(() => this.resetMessages());
      }
    });
  } 

  isChanged(): boolean {
    return this.facade.isChanged(this.roleEditForm, this.originalNameSnapshot);
  }

  get isButtonDisabled(): boolean {
    return this.roleEditForm.invalid || !this.isChanged() || this.isSaving();
  }

  submit() {
    if (!this.permissionsService.canEditGlobal() || this.isButtonDisabled) return;

    this.isSaving.set(true);
    const updatedRole = buildUpdateJobRolePayload({ ...this.roleEditForm.value }, this.roleToEdit().id);

    this.rolesService.updateJobRole(updatedRole).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.statusMessage = { text: 'Risorsa modificata con successo!', type: 'success' };
        this.modified.emit(updatedRole);
        this.roleEditForm.reset();
        this.cancel.emit();
      },
      error: (error: any) => {
        this.isSaving.set(false);
        this.attemptedSubmit = true;
        let errorMessage = 'Errore durante la modifica della risorsa';
        
        if (error.status === 400) errorMessage = 'Dati non validi. Controlla i campi inseriti.';
        else if (error.status === 404) errorMessage = 'Risorsa non trovato.';
        else if (error.status === 500) errorMessage = 'Errore del server. Riprova più tardi.';
        
        this.statusMessage = { text: errorMessage, type: 'error' };
      }
    });
  }

  onSubmitClick(event: Event) {
    if (!this.isChanged()) {
      event.preventDefault();
      this.noChangesMessage = true;
      return;
    }
    if (this.roleEditForm.invalid) {
      event.preventDefault();
      this.attemptedSubmit = true;
      this.roleEditForm.markAllAsTouched();
    }
  }

  onCancel() { this.cancel.emit(); }
  onFieldChange() { this.resetMessages(); }
  toId(key: string, i: number): string { return toElementId('role', key, i); }

  private resetMessages() {
    this.attemptedSubmit = false;
    this.noChangesMessage = false;
    this.statusMessage = null;
  }
}