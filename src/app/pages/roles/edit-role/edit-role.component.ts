import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { Role } from '../../../shared/models/role.model';
import { RolesService } from '../../../shared/services/roles.service';
import { buildUpdateRolePayload } from '../../../shared/payloads/role.payloads';

@Component({
  selector: 'app-modifica-role',
  imports: [CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './edit-role.component.html',
})
export class ModificaRoleComponent {
  roleToEdit = input.required<Role>();

  private rolesService = inject(RolesService);

  modified = output<Role>();
  cancel = output<void>();

  roleEditForm! : FormGroup;

  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;

  formData: Record<string, string> = {};
  private originalDataToCompare: any = {};

  readonly headers = [
    { key: 'name', label: 'Nome Ruolo' },
  ];

  constructor(private fb: FormBuilder) {
    effect(() => {
      const role = this.roleToEdit();
      if(!role) return;

      this.originalDataToCompare = {
        id: role.id,
        name: role.name || ''
      };

      if(this.roleEditForm) {
        this.roleEditForm.patchValue({name: role.name || ''});
      }
      else {
        this.initForm(role)
      }
    })
  } 

  initForm(role: Role) {
      this.roleEditForm = this.fb.group({
        name: [role.name || '', [Validators.required]]
      })

      this.roleEditForm.valueChanges.subscribe(() => {
        this.resetMessages();
      })
  }

  onCancel() {
    this.cancel.emit();
  }

  toId(key: string, i: number): string {
    return `role-${i}-${key}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase();
  }

  isRequiredField(key: string): boolean {
    return key === 'name';
  }

  onFieldChange() {
    this.resetMessages();
  }

  isChanged(): boolean {
    if(!this.roleEditForm) return false;

    const currentValues = this.roleEditForm.getRawValue();

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
    return this.roleEditForm.invalid || !this.isChanged();
  }

  submit() {
    if (this.roleEditForm.invalid || !this.isChanged()) {
      this.attemptedSubmit = !!this.roleEditForm.invalid;
      this.noChangesMessage = !this.isChanged();
      return;
    }

    const updatedRole = buildUpdateRolePayload({ ...this.formData, ...this.roleEditForm.value }, this.roleToEdit().id);

    this.rolesService.updateJobRole(updatedRole).subscribe({
        next: () => {
            this.attemptedSubmit = false;
            this.noChangesMessage = false;
            this.statusMessage = { text: 'Risorsa modificata con successo!', type: 'success' };
            this.modified.emit(updatedRole);
            this.roleEditForm.reset();
            this.cancel.emit();
        },
        error: (error: any) => {
            this.attemptedSubmit = true;
            let errorMessage = 'Errore durante la modifica della risorsa';
            
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

  getRequiredErrorMessage(key: string): string {
    const messages: Record<string, string> = {
      name: 'Nome obbligatorio',
    };
    return messages[key] || 'Campo obbligatorio';
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

  private resetMessages() {
    this.attemptedSubmit = false;
    this.noChangesMessage = false;
    this.statusMessage = null;
  }
}
