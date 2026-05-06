import { Component, input, output, OnInit, inject } from '@angular/core';
import { TextInputComponent } from '../../shared/text-input/text-input';
import { CLIENTE_HEADERS } from '../cliente/cliente.headers';
import { FormsModule, NgForm } from '@angular/forms';
import { Cliente } from '../cliente/cliente.model';
import { CommonModule } from '@angular/common';
import { RequestsService } from '../../shared/requests.service';

@Component({
  selector: 'app-modifica-cliente',
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './modifica.html',
  styleUrls: ['../../shared/cliente-form.css'],
})
export class ModificaClienteComponent implements OnInit {

    private requests = inject(RequestsService);
    //Riceviamo dal Padre (Cliente.ts) il cliente da modificare, e definiamo gli output per comunicare al padre le azioni di modifica o cancellazione.
    clienteDaModificare = input.required<Cliente>();

    //modified è l'output che emette il cliente modificato al padre, cancel è l'output che emette un evento di cancellazione al padre.
    modified = output<Cliente>();
    cancel = output<void>();

    // Variabili per gestione stato del form e messaggi
    attemptedSubmit = false;
    noChangesMessage = false;
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;
    dateRangeError = false;
    formData: any = {};
    baseData : any = {};

    // Variabile per memorizzare i dati originali del cliente, utile per verificare se ci sono state modifiche
    private OriginalData: string = '';

    // Headers dinamici basati su CLIENTE_HEADERS, escludendo campi non editabili come 'id'
    readonly headers = (Object.entries(CLIENTE_HEADERS) as [keyof Cliente, string][])
    .filter(([key]) => key !== 'id')
    .map(([key, label]) => ({ key, label }));

    ngOnInit() {
        const c = this.clienteDaModificare();
        // Inizializza formData con i dati del cliente da modificare
        this.baseData = JSON.parse(JSON.stringify(c));

        const separatedAddress = this.parseIndirizzo(c.fullAddress || '');

        this.formData = {
            ...this.baseData,
            ...separatedAddress
        };

        this.OriginalData = JSON.stringify(this.formData);
    }

    private parseIndirizzo(fullAddress : string){
        if(!fullAddress) return {};

        const parts = fullAddress.split(',');

        const address = parts[0]?.trim();
        const province = parts[2]?.trim();
        const country = parts[3]?.trim();

        let streetNumber = '';
        let postalCode = '';
        let city = '';

        if(parts[1]) {
            const middleParts = parts[1].split('-');

            streetNumber = middleParts[0]?.trim();

            if(middleParts[1]) {
                const postaCodeAndCity = middleParts[1].trim();
                postalCode = postaCodeAndCity.substring(0,5);
                city = postaCodeAndCity.substring(5).trim();
            }
        }

        return {
            address,
            streetNumber,
            postalCode,
            city,
            province,
            country,
        };

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

        this.requests.aggiornaCliente(this.formData).subscribe({
            next: () => {
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.statusMessage = { text: 'Cliente modificato con successo!', type: 'success' };
                this.modified.emit(this.formData);
                form.resetForm();
                this.formData = {};
            },
            error: (error: any) => {
                this.attemptedSubmit = true;
                let errorMessage = 'Errore durante la modifica del cliente';
                
                if (error.status === 400) {
                    errorMessage = 'Dati non validi. Controlla i campi inseriti.';
                } else if (error.status === 404) {
                    errorMessage = 'Cliente non trovato.';
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
    
    //Funzione per evitare problemi di caratteri speciali e maiuscole eventuali.
    toId(key: string, i: number): string {
    return `cliente-${i}-${key}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .toLowerCase();
    }

    isRequiredField(key: string): boolean {
        return key === 'vatNumber' || key === 'name';
    }

    getMaxLength(key: string): number | null {
        const limits: Record<string, number> = {
            vatNumber: 20,
            name: 60,
            address: 200,
            streetNumber: 10,
            postalCode: 10,
            city: 60,
            province: 10,
            country: 60
        };
        return limits[key] || null;
    }

    isNumericField(key: string): boolean {
        return key === 'projects';
    }

    getRequiredErrorMessage(key: string): string {
        const messages: Record<string, string> = {
            vatNumber: 'Partita IVA obbligatoria',
            name: 'Nome obbligatorio'
        };
        return messages[key] || 'Campo obbligatorio';
    }

    getMaxLengthErrorMessage(key: string): string {
        const maxLength = this.getMaxLength(key);
        if (!maxLength) return 'Lunghezza massima superata';
        
        const messages: Record<string, string> = {
            vatNumber: `Massimo ${maxLength} caratteri per Partita IVA`,
            name: `Massimo ${maxLength} caratteri per Nome`,
            address: `Massimo ${maxLength} caratteri per Indirizzo`,
            streetNumber: `Massimo ${maxLength} caratteri per Civico`,
            postalCode: `Massimo ${maxLength} caratteri per CAP`,
            city: `Massimo ${maxLength} caratteri per Città`,
            province: `Massimo ${maxLength} caratteri per Provincia`,
            country: `Massimo ${maxLength} caratteri per Paese`
        };
        return messages[key] || `Massimo ${maxLength} caratteri`;
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
