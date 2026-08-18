import { Component, input, output, HostListener, inject, signal, effect } from '@angular/core';
import { TextInputComponent } from '../../../../shared/text-input/text-input.component';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Employee } from '../../../../shared/models/employee.model';
import { EMPLOYEES_HEADERS_FORM } from '../../../employees/employee.headers';
import { forkJoin } from 'rxjs';
import { EmployeesService } from '../../../../shared/services/employees.service';
import { LookupsService } from '../../../../shared/services/lookups.service';
import { buildEmployeePayload, buildEmployeeUiFallback } from '../../../../shared/payloads/employee.payloads';
import { normalizeEmployeeForForm } from '../../../../shared/utils/employee-form.utils';
import { toElementId } from '../../../../shared/utils/project-form.utils';
import { JobRolesService } from '../../../../shared/services/job-roles.service';

@Component({
  selector: 'app-edit-employee-for-work-group',
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './edit-employee-for-work-group.component.html',
})
export class EditEmployeeForRoleComponent {

    private employeesService = inject(EmployeesService);
    private rolesService = inject(JobRolesService)
    private lookupsService = inject(LookupsService);
    risorsaDaModificare = input.required<Employee | null>();

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

    private OriginalData: string = '';

    // Headers dinamici basati su RISORSE_HEADERS, escludendo campi non editabili come 'id'
    readonly headers = (Object.entries(EMPLOYEES_HEADERS_FORM) as [keyof Employee, string][])
    .filter(([key]) => key !== 'id' && key !== 'isActive') // Escludiamo anche IsActive se non vogliamo modificarlo qui
    .map(([key, label]) => ({ key, label }));

    ngOnInit() {
        forkJoin({
            roles: this.rolesService.loadAllJobRoles(),
            levels: this.rolesService.loadJobRoleLevels(),
            companies: this.lookupsService.loadAvailableCompanies()
        }).subscribe({
            next: ({ roles, levels, companies }) => {
                this.listaJobRoles.set(roles);
                this.listaJobRoleLevels.set(levels);
                this.listaAziende.set(companies);
            },
            error: (error) => {
                this.statusMessage = { 
                    text: 'Errore durante il caricamento dei dati: ' + error.message, 
                    type: 'error' 
                };
            }
        });

        this.formData = {
            ...this.baseData,
        };

        this.OriginalData = JSON.stringify(this.formData);
    }

    // Reagiamo ai cambiamenti dell'input `risorsaDaModificare` (può arrivare dopo l'inizializzazione)
    private syncRisorsa = effect(() => {
        const r = this.risorsaDaModificare();
        if (!r) return;
        // normalizziamo i campi per essere sicuri che `formData` contenga le chiavi usate nei `headers`
        this.baseData = JSON.parse(JSON.stringify(r));
        const normalized = normalizeEmployeeForForm(this.baseData);
        console.log('Modifica: risorsa ricevuta per edit:', r, '-> normalizzata:', normalized);
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

        const uiFallback = buildEmployeeUiFallback({ ...this.formData, ...form.value }, this.formData.id);
        const backendPayload = buildEmployeePayload(uiFallback, {
            roles: this.listaJobRoles(),
            levels: this.listaJobRoleLevels(),
            companies: this.listaAziende(),
        });

        this.employeesService.updateEmployee(this.formData.id, backendPayload, uiFallback).subscribe({
            next: () => {
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.statusMessage = { text: 'Risorsa modificata con successo!', type: 'success' };
                this.modified.emit(uiFallback);
                form.resetForm();
                this.formData = {};
                // Chiudi il form dopo il successo
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
    
    //Funzione per evitare problemi di caratteri speciali e maiuscole eventuali
    toId(key: string, i: number): string {
    return toElementId('employee', key, i);
    }

    isRequiredField(key: string): boolean {
        return key === 'name' || key === 'surname' || key === 'jobRole' || key === 'jobRoleLevel' || key === 'company';
    }

    getRequiredErrorMessage(key: string): string {
        const messages: Record<string, string> = {
            name: 'Nome obbligatorio'
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

    @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent) {
        const target = event.target as Element | null;
        
        if (this.jobRoleDropdownOpen() && !target?.closest('.job-role-combo')) {
            this.jobRoleDropdownOpen.set(false);
            this.showAllJobRoles.set(false);
        }
    }
}
