import { Component, input, output, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { TextInputComponent } from '../../shared/text-input/text-input';
import { RequestsService } from '../../shared/requests.service';
import { Role } from '../role.model';

@Component({
  selector: 'app-new-role',
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './new-role.html',
  styleUrls: ['../../shared/progetto-form.css', './new-role.css'],
})
export class NewRoleComponent implements OnInit {

    private requests = inject(RequestsService);
    
    // Input dal componente padre (RolesComponent)
    ruoloDaAggiungere = input.required<Role | null>();

    // Output verso il componente padre
    added = output<Role>();
    cancel = output<void>();

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

    ngOnInit() {
        this.formData = { ...this.baseData };
        this.OriginalData = JSON.stringify(this.formData);
    }

    private normalizeRoleForForm(role: any) {
        if (!role) return {};
        return {
            id: role.id || role.Id || role.ID || '',
            name: role.name || role.Name || '',
        };
    }

    onCancel() {
        this.cancel.emit();
    }

    // Reagiamo ai cambiamenti dell'input `ruoloDaAggiungere`
    private syncRuolo = effect(() => {
        const r = this.ruoloDaAggiungere();
        if (!r) return;
        
        this.baseData = JSON.parse(JSON.stringify(r));
        const normalized = this.normalizeRoleForForm(this.baseData);
        
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

    isSubmitDisabled(form: NgForm): boolean {
        return form.invalid || !this.isChanged();
    }

    submit(form: NgForm) {
        console.log("1. Pulsante premuto! Form valido?", form.valid, "| Dati cambiati?", this.isChanged());
        console.log("Valori attuali del form:", form.value);

        // Se il form non è valido o non ci sono modifiche, blocca tutto
        if (form.invalid || !this.isChanged()) {
            console.warn("BLOCCATO: Il form non è valido o non è stato modificato.");
            return;
        }

        const payloadCompleto = {
            name: this.formData.name || form.value.name
        };

        console.log("2. Nessun blocco. Chiamo il service con il payload:", payloadCompleto);

        this.requests.aggiungiJobRole(payloadCompleto).subscribe({
            next: (response) => {
                console.log("3. SUCCESSO! Il server ha risposto:", response);
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.added.emit(payloadCompleto);
                form.resetForm();
                this.formData = {};
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

}