import { inject, Injectable, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Injectable()
export class JobRoleFormFacade {
  private fb = inject(FormBuilder);

  // Headers dinamici per la gestione del Ruolo
  readonly headers = [
    { key: 'name', label: 'Nome Ruolo' }
  ];

  // Generatore del Form
  buildForm(initialName: string = ''): FormGroup {
    return this.fb.group({
      name: [initialName, [Validators.required]]
    });
  }

  isChanged(form: FormGroup, originalName: string | null | undefined): boolean {
    if (!form) return false;
    const currentName = form.get('name')?.value == null ? '' : String(form.get('name')?.value).trim();
    const cleanOriginalName = originalName == null ? '' : String(originalName).trim();

    return currentName !== cleanOriginalName;
  }

  getRequiredErrorMessage(key: string): string {
    const messages: Record<string, string> = {
      name: 'Nome obbligatorio',
    };
    return messages[key] || 'Campo obbligatorio';
  }
}