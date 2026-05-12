import { Component, input, output, OnInit, inject, signal, effect } from '@angular/core';
import { TextInputComponent } from '../../../shared/text-input/text-input';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RequestsService } from '../../../shared/requests.service';
import { Employee } from '../../../employees/employee.model';
import { EMPLOYEES_HEADERS } from '../../../employees/employee.headers';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-modifica-risorsa-per-ruolo',
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './edit-role.component.html',
  styleUrls: ['../../../shared/form-styles.css'],
})
export class EditEmployeeForRoleComponent {

    private requests = inject(RequestsService);
    //Riceviamo dal Padre (Cliente.ts) il cliente da modificare, e definiamo gli output per comunicare al padre le azioni di modifica o cancellazione.
    risorsaDaModificare = input.required<Employee | null>();

    //modified è l'output che emette il cliente modificato al padre, cancel è l'output che emette un evento di cancellazione al padre.
    modified = output<Employee>();
    cancel = output<void>();

    // Variabili per gestione stato del form e messaggi
    attemptedSubmit = false;
    noChangesMessage = false;
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;
    dateRangeError = false;
    formData: any = {};
    baseData : any = {};

    listaJobRoles = signal<any[]>([]);
    listaJobRoleLevels = signal<any[]>([]);
    listaAziende = signal<any[]>([]);
    jobRoleDropdownOpen = signal(false);
    showAllJobRoles = signal(false);

    // Variabile per memorizzare i dati originali del cliente, utile per verificare se ci sono state modifiche
    private OriginalData: string = '';

    // Headers dinamici basati su RISORSE_HEADERS, escludendo campi non editabili come 'id'
    readonly headers = (Object.entries(EMPLOYEES_HEADERS) as [keyof Employee, string][])
    .filter(([key]) => key !== 'id' && key !== 'isActive') // Escludiamo anche IsActive se non vogliamo modificarlo qui
    .map(([key, label]) => ({ key, label }));

    ngOnInit() {
        const caricamenti = [
            this.requests.caricaTuttiJobRolesDisponibili(),
            this.requests.caricaJobRoleLevelsDisponibili(),
            this.requests.caricaAziendeDisponibili()
        ];

        forkJoin(caricamenti).subscribe(risultati => {
            this.listaJobRoles.set(risultati[0]);
            this.listaJobRoleLevels.set(risultati[1]);
            this.listaAziende.set(risultati[2]);
        }, error => {
            this.statusMessage = { text: 'Errore durante il caricamento dei dati: ' + error.message, type: 'error' };
        });

        this.formData = {
            ...this.baseData,
        };

        this.OriginalData = JSON.stringify(this.formData);
    }

        // Reagiamo ai cambiamenti dell'input `risorsaDaModificare` (può arrivare dopo l'inizializzazione)
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

        private syncRisorsa = effect(() => {
            const r = this.risorsaDaModificare();
            if (!r) return;
            // normalizziamo i campi per essere sicuri che `formData` contenga le chiavi usate nei `headers`
            this.baseData = JSON.parse(JSON.stringify(r));
            const normalized = this.normalizeEmployeeForForm(this.baseData);
            console.log('Modifica: risorsa ricevuta per edit:', r, '-> normalizzata:', normalized);
            this.formData = { ...normalized };
            this.OriginalData = JSON.stringify(this.formData);
        });

    // private parseIndirizzo(fullAddress : string){
    //     if(!fullAddress) return {};

    //     const parts = fullAddress.split(',');

    //     const address = parts[0]?.trim();
    //     const province = parts[2]?.trim();
    //     const country = parts[3]?.trim();

    //     let streetNumber = '';
    //     let postalCode = '';
    //     let city = '';

    //     if(parts[1]) {
    //         const middleParts = parts[1].split('-');

    //         streetNumber = middleParts[0]?.trim();

    //         if(middleParts[1]) {
    //             const postaCodeAndCity = middleParts[1].trim();
    //             postalCode = postaCodeAndCity.substring(0,5);
    //             city = postaCodeAndCity.substring(5).trim();
    //         }
    //     }

    //     return {
    //         address,
    //         streetNumber,
    //         postalCode,
    //         city,
    //         province,
    //         country,
    //     };

     // }

    getOptions(key: string): any[] {
        switch (key) {
            case 'jobRole': return this.listaJobRoles();
            case 'jobRoleLevel': return this.listaJobRoleLevels();
            case 'company': return this.listaAziende();
            default: return [];
        }
    }

    optionName(opt: any): string {
        return opt?.name || opt?.Name || opt || '';
    }

    getFilteredJobRoles(): any[] {
        const term = this.showAllJobRoles()
            ? ''
            : (this.formData.jobRole || '').toString().trim().toLowerCase();

        if (!term) {
            return this.listaJobRoles();
        }

        return this.listaJobRoles().filter((role) =>
            this.optionName(role).toLowerCase().includes(term)
        );
    }

    onJobRoleInput() {
        this.showAllJobRoles.set(false);
        this.jobRoleDropdownOpen.set(true);
        this.onFieldChange();
    }

    onJobRoleFocus() {
        this.showAllJobRoles.set(true);
        this.jobRoleDropdownOpen.set(true);
    }

    toggleJobRoleDropdown() {
        this.showAllJobRoles.set(true);
        this.jobRoleDropdownOpen.update((open) => !open);
    }

    selectJobRole(role: any) {
        this.formData.jobRole = this.optionName(role);
        this.jobRoleDropdownOpen.set(false);
        this.showAllJobRoles.set(false);
        this.onFieldChange();
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
        id: this.formData.id, // Assicurati di recuperare l'ID originale qui
        ...form.value            // Prende name, surname, jobRole ecc. dal form
        };

        this.requests.aggiornaEmployee(payloadCompleto).subscribe({
            next: () => {
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.statusMessage = { text: 'Risorsa modificata con successo!', type: 'success' };
                this.modified.emit(payloadCompleto);
                form.resetForm();
                this.formData = {};
                // Chiudi il dialogo dopo il successo
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
        return key === 'name' || key === 'surname' || key === 'jobRole' || key === 'jobRoleLevel' || key === 'company';
    }

    // getMaxLength(key: string): number | null {
    //     const limits: Record<string, number> = {
    //         vatNumber: 20,
    //         name: 60,
    //         address: 200,
    //         streetNumber: 10,
    //         postalCode: 10,
    //         city: 60,
    //         province: 10,
    //         country: 60
    //     };
    //     return limits[key] || null;
    // }

    // isNumericField(key: string): boolean {
    //     return key === 'projects';
    // }

    getRequiredErrorMessage(key: string): string {
        const messages: Record<string, string> = {
            name: 'Nome obbligatorio'
        };
        return messages[key] || 'Campo obbligatorio';
    }

    // getMaxLengthErrorMessage(key: string): string {
    //     const maxLength = this.getMaxLength(key);
    //     if (!maxLength) return 'Lunghezza massima superata';
        
    //     const messages: Record<string, string> = {
    //         vatNumber: `Massimo ${maxLength} caratteri per Partita IVA`,
    //         name: `Massimo ${maxLength} caratteri per Nome`,
    //         address: `Massimo ${maxLength} caratteri per Indirizzo`,
    //         streetNumber: `Massimo ${maxLength} caratteri per Civico`,
    //         postalCode: `Massimo ${maxLength} caratteri per CAP`,
    //         city: `Massimo ${maxLength} caratteri per Città`,
    //         province: `Massimo ${maxLength} caratteri per Provincia`,
    //         country: `Massimo ${maxLength} caratteri per Paese`
    //     };
    //     return messages[key] || `Massimo ${maxLength} caratteri`;
    // }

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
