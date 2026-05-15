import { Component, input, output, OnInit, inject } from '@angular/core';
import { TextInputComponent } from '../../shared/text-input/text-input';
import { CUSTOMER_HEADERS } from '../customer/customer.headers';
import { FormsModule, NgForm } from '@angular/forms';
import { Customer } from '../../shared/models/customer.model';
import { CommonModule } from '@angular/common';
import { CustomersService } from '../../shared/services/customers.service';
import { parseCustomerAddress } from '../../shared/utils/customer-form.utils';
import { toElementId } from '../../shared/utils/project-form.utils';

@Component({
  selector: 'app-edit-customer',
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './edit-customer.component.html',
  styleUrls: ['../../shared/form-styles.css'],
})
export class EditCustomerComponent implements OnInit {

    private customersService = inject(CustomersService);
    //Riceviamo dal Padre (Cliente.ts) il cliente da modificare, e definiamo gli output per comunicare al padre le azioni di modifica o cancellazione.
    selectedCustomerToEdit = input.required<Customer>();

    //modified è l'output che emette il cliente modificato al padre, cancel è l'output che emette un evento di cancellazione al padre.
    modified = output<Customer>();
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
    readonly headers = (Object.entries(CUSTOMER_HEADERS) as [keyof Customer, string][])
    .filter(([key]) => key !== 'id')
    .map(([key, label]) => ({ key, label }));

    ngOnInit() {
        const c = this.selectedCustomerToEdit();
        // Inizializza formData con i dati del cliente da modificare
        this.baseData = JSON.parse(JSON.stringify(c));

        const separatedAddress = parseCustomerAddress(c.fullAddress || '');

        this.formData = {
            ...this.baseData,
            ...separatedAddress
        };

        this.OriginalData = JSON.stringify(this.formData);
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

        this.customersService.updateCustomer(this.formData).subscribe({
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
    return toElementId('cliente', key, i);
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
