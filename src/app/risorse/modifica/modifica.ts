import { Component, input, output, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { TextInputComponent } from '../../shared/text-input/text-input';
import { RequestsService } from '../../shared/requests.service';
import { Employee } from '../risorse.model'; 
import { RISORSE_HEADERS } from '../risorse.headers'; 

@Component({
  selector: 'app-modifica-risorsa',
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './modifica.html',
  styleUrls: ['../../shared/progetto-form.css', './modifica.css'], // Mantenuto il css condiviso e aggiunto quello specifico
})
export class ModificaRisorsaComponent implements OnInit {

    private requests = inject(RequestsService);
    
    // Input dal componente padre (RisorseComponent)
    risorsaDaModificare = input.required<Employee | null>();

    // Output verso il componente padre
    modified = output<Employee>();
    cancel = output<void>();

    // Variabili per gestione stato del form e messaggi
    attemptedSubmit = false;
    noChangesMessage = false;
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;
    dateRangeError = false;
    formData: any = {};
    baseData: any = {};

    // Segnali per i menu a tendina
    listaJobRoles = signal<any[]>([]);
    listaJobRoleLevels = signal<any[]>([]);
    listaAziende = signal<any[]>([]);

    // Variabile per memorizzare i dati originali, utile per verificare se ci sono state modifiche
    private OriginalData: string = '';

    // Headers dinamici basati su RISORSE_HEADERS, escludendo campi non editabili come 'id' e 'isActive'
    readonly headers = (Object.entries(RISORSE_HEADERS) as [keyof Employee, string][])
        .filter(([key]) => key !== 'id' && key !== 'isActive') 
        .map(([key, label]) => ({ key, label }));

    ngOnInit() {
        const caricamenti = [
            this.requests.caricaJobRolesDisponibili(),
            this.requests.caricaJobRoleLevelsDisponibili(),
            this.requests.caricaAziendeDisponibili()
        ];

        forkJoin(caricamenti).subscribe({
            next: (risultati) => {
                this.listaJobRoles.set(risultati[0]);
                this.listaJobRoleLevels.set(risultati[1]);
                this.listaAziende.set(risultati[2]);
            }, 
            error: (error) => {
                this.statusMessage = { text: 'Errore durante il caricamento dei dati: ' + error.message, type: 'error' };
            }
        });

        this.formData = { ...this.baseData };
        this.OriginalData = JSON.stringify(this.formData);
    }

    // Normalizziamo i dati in ingresso per uniformità delle chiavi
    private normalizeEmployeeForForm(employee: any) {
        if (!employee) return {};
        return {
            id: employee.id || employee.Id || employee.ID || '',
            name: employee.name || employee.Name || '',
            surname: employee.surname || employee.Surname || '',
            jobRole: employee.jobRole || employee.JobRole || '',
            jobRoleLevel: employee.jobRoleLevel || employee.JobRoleLevel || '',
            company: employee.company || employee.Company || '',
            isActive: employee.isActive !== undefined ? employee.isActive : (employee.IsActive !== undefined ? employee.IsActive : true),
        };
    }

    // Reagiamo ai cambiamenti dell'input `risorsaDaModificare`
    private syncRisorsa = effect(() => {
        const r = this.risorsaDaModificare();
        if (!r) return;
        
        this.baseData = JSON.parse(JSON.stringify(r));
        const normalized = this.normalizeEmployeeForForm(this.baseData);
        
        console.log('Modifica Risorsa: dati ricevuti:', r, '-> normalizzati:', normalized);
        
        this.formData = { ...normalized };
        this.OriginalData = JSON.stringify(this.formData);
    });

    getOptions(key: string): any[] {
        switch (key) {
            case 'jobRole': return this.listaJobRoles();
            case 'jobRoleLevel': return this.listaJobRoleLevels();
            case 'company': return this.listaAziende();
            default: return [];
        }
    }

    isChanged(): boolean {
        return JSON.stringify(this.formData) !== this.OriginalData;
    }

    isSubmitDisabled(form: NgForm): boolean {
        return form.invalid || !this.isChanged();
    }

    submit(form: NgForm) {
        if (form.invalid || !this.isChanged()) {
            return;
        }

        const payloadCompleto = {
            id: this.formData.id, // Recupero ID originale
            ...form.value         // Dati aggiornati dal form
        };

        this.requests.aggiornaEmployee(payloadCompleto).subscribe({
            next: () => {
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.statusMessage = { text: 'Risorsa modificata con successo!', type: 'success' };
                this.modified.emit(payloadCompleto);
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

    onCancel() {
        this.cancel.emit();
    }
    
    toId(key: string, i: number): string {
        return `risorsa-${i}-${key}`
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .toLowerCase();
    }

    isRequiredField(key: string): boolean {
        return key === 'name' || key === 'surname' || key === 'jobRole' || key === 'jobRoleLevel' || key === 'company';
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

    onFieldChange() {
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.statusMessage = null;
    }
}