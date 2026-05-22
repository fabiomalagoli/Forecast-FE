import { Component, input, output, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';

import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { RolesService } from '../../../shared/services/roles.service';
import { Role } from '../../../shared/models/role.model';
import { buildCreateRolePayload } from '../../../shared/payloads/role.payloads';
import { createEmptyRoleFormData, normalizeRoleForForm } from '../../../shared/utils/role-form.utils';

@Component({
  selector: 'app-new-role',
  imports: [FormsModule, CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './new-role.component.html',
})
export class NewRoleComponent {

    private rolesService = inject(RolesService);
    
    // Input dal componente padre (RolesComponent)
    roleToAdd = input.required<Role | null>();

    // Output verso il componente padre
    added = output<void>();
    cancel = output<void>();

    roleCreateForm! : FormGroup;

    // Variabili per gestione stato del form e messaggi
    attemptedSubmit = false;
    noChangesMessage = false;
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;
    formData: any = {};
    baseData: any = {};

    private OriginalData: string = '';

    // Il modello Role ha solo 'name' in fase di creazione
    readonly headers = [
        { key: 'name', label: 'Nome Ruolo' }
    ];

    constructor(private fb: FormBuilder) {
        this.initForm();
    }

    initForm() {
        const formControls: { [key: string]: any } = {};
        this.headers.forEach(header => {
            formControls[header.key] = ['', Validators.required];
        });

        this.roleCreateForm = this.fb.group(formControls);
    }

    onCancel() {
        this.cancel.emit();
    }

    // Reagiamo ai cambiamenti dell'input `ruoloDaAggiungere`
    private syncRuolo = effect(() => {
        const r = this.roleToAdd();
        if (!r) return;
        
        this.baseData = JSON.parse(JSON.stringify(r));
        const normalized = normalizeRoleForForm(this.baseData);
        
        console.log('Nuovo Ruolo: dati ricevuti:', r, '-> normalizzati:', normalized);
        
        this.formData = { ...normalized };
        this.OriginalData = JSON.stringify(this.formData);
    });

    toId(key: string, i: number): string {
        return `risorsa-${i}-${key}`
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
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.statusMessage = null;
    }

    isChanged(): boolean {
        return JSON.stringify(this.formData) !== this.OriginalData;
    }

    isSubmitDisabled(): boolean {
        return this.roleCreateForm.invalid || !this.isChanged();
    }

    submit() {
        console.log("1. Pulsante premuto! Form valido?", this.roleCreateForm.valid, "| Dati cambiati?", this.isChanged());
        console.log("Valori attuali del form:", this.roleCreateForm.value);

        // Se il form non è valido o non ci sono modifiche, blocca tutto
        if (this.roleCreateForm.invalid || !this.isChanged()) {
            console.warn("BLOCCATO: Il form non è valido o non è stato modificato.");
            return;
        }

        const payload = buildCreateRolePayload({ ...this.formData, ...this.roleCreateForm.value });

        console.log("2. Nessun blocco. Chiamo il service con il payload:", payload);

        this.rolesService.addJobRole(payload).subscribe({
            next: (response) => {
                console.log("3. SUCCESSO! Il server ha risposto:", response);
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.added.emit();
                this.roleCreateForm.reset();
                this.cancel.emit();
            },
            error: (error: any) => {
                console.error("3. ERRORE! Il server ha respinto la richiesta:", error);
                this.attemptedSubmit = true;
                
                let errorMessage = 'Errore durante l\'aggiunta del ruolo';
                if (error.status === 400) errorMessage = 'Dati non validi.';
                if (error.status === 409) errorMessage = 'Il ruolo esiste già.';
                
                this.statusMessage = { text: errorMessage, type: 'error' };
            }
        });
    }

    getRequiredErrorMessage(key: string): string {
        const messages: Record<string, string> = {
            name: 'Nome obbligatorio',
            surname: 'Cognome obbligatorio'
        };
        return messages[key] || 'Campo obbligatorio';
    }

    onSubmitClick(event: Event) {
        if (!this.isChanged()) {
            event.preventDefault();
            this.noChangesMessage = true;
            return;
        } 
        if (this.roleCreateForm.invalid) {
            event.preventDefault();
            this.attemptedSubmit = true;
            this.roleCreateForm.markAllAsTouched();
        }
    }

}
