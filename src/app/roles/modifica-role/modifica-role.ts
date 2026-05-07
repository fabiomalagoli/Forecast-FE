import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { TextInputComponent } from '../../shared/text-input/text-input';
import { Role } from '../role.model';
import { RequestsService } from '../../shared/requests.service';

@Component({
  selector: 'app-modifica-role',
  imports: [CommonModule, FormsModule, TextInputComponent],
  templateUrl: './modifica-role.html',
  styleUrls: ['../../shared/form-styles.css'],
})
export class ModificaRoleComponent {
  ruoloDaModificare = input.required<Role>();

  private requests = inject(RequestsService);

  modified = output<Role>();
  cancel = output<void>();

  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;

  formData: Record<string, string> = {};
  private originalData = '';

  readonly headers = [
    { key: 'name', label: 'Nome Ruolo' },
  ];

  private syncRuolo = effect(() => {
    const role = this.ruoloDaModificare();
    if (!role) return;

    this.formData = {
      id: role.id,
      name: role.name || '',
    };
    this.originalData = JSON.stringify(this.formData);
    this.resetMessages();
  });

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
    return JSON.stringify(this.formData) !== this.originalData;
  }

  isSubmitDisabled(form: NgForm): boolean {
    return form.invalid || !this.isChanged();
  }

  submit(form: NgForm) {
    if (form.invalid || !this.isChanged()) {
      this.attemptedSubmit = !!form.invalid;
      this.noChangesMessage = !this.isChanged();
      return;
    }

    const updatedRole: Role = {
      id: this.formData['id'] || this.ruoloDaModificare().id,
      name: this.formData['name'] || form.value.name,
    };

    this.requests.aggiornaJobRole(updatedRole).subscribe({
        next: () => {
            this.attemptedSubmit = false;
            this.noChangesMessage = false;
            this.statusMessage = { text: 'Risorsa modificata con successo!', type: 'success' };
            this.modified.emit(updatedRole);
            form.resetForm();
            this.formData = {};
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

  private resetMessages() {
    this.attemptedSubmit = false;
    this.noChangesMessage = false;
    this.statusMessage = null;
  }
}
