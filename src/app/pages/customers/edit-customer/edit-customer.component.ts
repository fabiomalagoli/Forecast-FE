import { Component, input, output, OnInit, inject } from '@angular/core';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { CUSTOMER_HEADERS } from '../customer/customer.headers';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Customer } from '../../../shared/models/customer.model';
import { CommonModule } from '@angular/common';
import { CustomersService } from '../../../shared/services/customers.service';
import { parseCustomerAddress } from '../../../shared/utils/customer-form.utils';
import { toElementId } from '../../../shared/utils/project-form.utils';

@Component({
  selector: 'app-edit-customer',
  imports: [CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './edit-customer.component.html',
})
export class EditCustomerComponent implements OnInit {

    private customersService = inject(CustomersService);
    private fb = inject(FormBuilder);

    //Riceviamo dal Padre (Cliente.ts) il cliente da modificare, e definiamo gli output per comunicare al padre le azioni di modifica o cancellazione.
    selectedCustomerToEdit = input.required<Customer>();

    editCustomerForm!: FormGroup;

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
    private originalDataToCompare: any = {};

    // Headers dinamici basati su CLIENTE_HEADERS, escludendo campi non editabili come 'id'
    readonly headers = (Object.entries(CUSTOMER_HEADERS) as [keyof Customer, string][])
        .filter(([key, label]) => key !== 'id' && label !== 'Progetti Attivi')
        .map(([key, label]) => ({ key, label }));

    ngOnInit() {
        this.initForm();
    }

    private initForm() {
        const customer = this.selectedCustomerToEdit();
        const separateAddress = parseCustomerAddress(customer.fullAddress || '');

        const initialData = {
            ...customer,
            ...separateAddress
        };

        this.originalDataToCompare = {...initialData};

        const formControls: { [key: string]: any } = {};

        this.headers.forEach(header => {
            const validators = [Validators.required];
            const key = header.key;

            const initialValue = initialData[key as keyof typeof initialData] || ''; //indirizziamo la chiave del tipo corrispondente a quello dell'header in questione

            if(this.isRequiredField(key)) {
                validators.push(Validators.required);
            }

            const maxLength = this.getMaxLength(key);
            if(maxLength) {
                validators.push(Validators.maxLength(maxLength));
            }

            if (key === 'streetNumber') {
                validators.push(Validators.pattern(/^\d+(\/[a-zA-Z]+)?$/));
            } else if(this.isNumericField(key)) {
                validators.push(Validators.pattern(/^\d+$/));
            }

            formControls[key] = [initialValue, validators];
        });

        this.editCustomerForm = this.fb.group(formControls);

    }

    isChanged(): boolean {
        if(!this.editCustomerForm) return false;

        // Confrontiamo i JSON
        const currentValues = this.editCustomerForm.getRawValue();

       // Controlliamo chiave per chiave
        for (const key of Object.keys(currentValues)) {
        // Normalizziamo i valori convertendoli tutti in stringa e gestendo i null/undefined
        const currentValue = currentValues[key] == null ? '' : String(currentValues[key]).trim();
        const originalValue = this.originalDataToCompare[key] == null ? '' : String(this.originalDataToCompare[key]).trim();
        
        // Se troviamo anche solo un valore diverso, il form è stato modificato
        if (currentValue !== originalValue) {
            return true; 
        }
        }

        return false;
    }

    isSubmitDisabled(): boolean {
        return this.editCustomerForm.invalid || !this.isChanged();
    }

    submit() {
        if (this.editCustomerForm.invalid || !this.isChanged()) {
            return;
        }

        const updateCustomerData = {
            ...this.originalDataToCompare,
            ...this.editCustomerForm.value
        };

        this.customersService.updateCustomer(updateCustomerData).subscribe({
            next: () => {
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.statusMessage = { text: 'Cliente modificato con successo!', type: 'success' };
                this.modified.emit(updateCustomerData);
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
            const numericKeys = ['projects', 'postalCode'];
            return numericKeys.includes(key);
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

    onSubmitClick(event: Event) {
    if (!this.isChanged()) {
        event.preventDefault();
        this.noChangesMessage = true;
        return;
        } 
    if (this.editCustomerForm.invalid) {
        event.preventDefault();
        this.attemptedSubmit = true;
        this.editCustomerForm.markAllAsTouched();
    }
    }

    onFieldChange() {
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.statusMessage = null;
    }
}
