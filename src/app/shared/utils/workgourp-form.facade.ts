import { inject, Injectable, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export function toElementId(prefix: string, key: string, index: number): string {
  return `${prefix}-${index}-${key}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
}

@Injectable()
export class WorkGroupFormFacade {
  private fb = inject(FormBuilder);

  // Headers dinamici per la gestione del Ruolo
  readonly headers = [
    { key: 'name', label: 'Nome Gruppo' }
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