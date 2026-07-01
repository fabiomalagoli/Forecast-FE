import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { Role } from '../../../shared/models/role.model';
import { buildUpdateRolePayload } from '../../../shared/payloads/role.payloads';
import { RoleFormFacade } from '../../../shared/utils/role-form.facade';
import { toElementId } from '../../../shared/utils/project-form.utils';
import { WorkGroupFormFacade } from '../../../shared/utils/workgourp-form.facade';
import { WorkGroupsService } from '../../../shared/services/workgroups.service';
import { WorkGroup } from '../../../shared/models/workgroups.model';

@Component({
  selector: 'app-modifica-work-group',
  standalone: true,
  imports: [CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './edit-work-group.component.html',
  providers: [WorkGroupFormFacade]
})
export class ModificaWorkGroupComponent {
  public facade = inject(WorkGroupFormFacade);
  private workGroupsService = inject(WorkGroupsService);

  workGroupToEdit = input.required<WorkGroup>();

  modified = output<Role>();
  cancel = output<void>();

  workGroupEditForm!: FormGroup;

  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  isSaving = signal(false);

  private originalNameSnapshot = '';

  constructor() {
    effect(() => {
      const role = this.workGroupToEdit();
      if (!role) return;

      this.originalNameSnapshot = role.name || '';

      if (this.workGroupEditForm) {
        this.workGroupEditForm.patchValue({ name: this.originalNameSnapshot }, { emitEvent: false });
      } else {
        this.workGroupEditForm = this.facade.buildForm(this.originalNameSnapshot);
        
        this.workGroupEditForm.valueChanges.subscribe(() => this.resetMessages());
      }
    });
  } 

  isChanged(): boolean {
    return this.facade.isChanged(this.workGroupEditForm, this.originalNameSnapshot);
  }

  get isButtonDisabled(): boolean {
    return this.workGroupEditForm.invalid || !this.isChanged() || this.isSaving();
  }

  submit() {
    if (this.isButtonDisabled) return;

    this.isSaving.set(true);
    const updatedWorkGroup = buildUpdateRolePayload({ ...this.workGroupEditForm.value }, this.workGroupToEdit().id);

    this.workGroupsService.updateWorkGroup(this.workGroupToEdit() ,updatedWorkGroup).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.statusMessage = { text: 'Gruppo modificato con successo!', type: 'success' };
        this.modified.emit(updatedWorkGroup);
        this.workGroupEditForm.reset();
        this.cancel.emit();
      },
      error: (error: any) => {
        this.isSaving.set(false);
        this.attemptedSubmit = true;
        let errorMessage = 'Errore durante la modifica del gruppo';
        
        if (error.status === 400) errorMessage = 'Dati non validi. Controlla i campi inseriti.';
        else if (error.status === 404) errorMessage = 'Gruppo non trovato.';
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
    if (this.workGroupEditForm.invalid) {
      event.preventDefault();
      this.attemptedSubmit = true;
      this.workGroupEditForm.markAllAsTouched();
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