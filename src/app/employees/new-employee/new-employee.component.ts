import { Component, input, output, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TextInputComponent } from '../../shared/text-input/text-input';
import { Employee } from '../employee.model'; 
import { EMPLOYEES_HEADERS } from '../employee.headers'; 
import { EmployeesService } from '../../shared/services/employees.service';
import { RolesService } from '../../shared/services/roles.service';
import { LookupsService } from '../../shared/services/lookups.service';
import { buildEmployeePayload, buildEmployeeUiFallback } from '../../shared/payloads/employee.payloads';
import { normalizeEmployeeForForm } from '../../shared/utils/employee-form.utils';
import { toElementId } from '../../shared/utils/project-form.utils';

@Component({
  selector: 'app-new-employee',
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './new-employee.component.html',
  styleUrls: ['../../shared/form-styles.css'],
})
export class NewRisorsaComponent implements OnInit {

    private employeesService = inject(EmployeesService);
    private rolesService = inject(RolesService);
    private lookupsService = inject(LookupsService);
    
    // Input dal componente padre (RisorseComponent)
    selectedEmployeeToAdd = input.required<Employee | null>();

    // Output verso il componente padre
    added = output<Employee>();
    cancel = output<void>();

    // Variabili per gestione stato del form e messaggi
    attemptedSubmit = false;
    noChangesMessage = false;
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;
    dateRangeError = false;
    formData: any = {};
    baseData: any = {};

    // Segnali per i menu a tendina
    jobRolesList = signal<any[]>([]);
    jobRolesLevelsList = signal<any[]>([]);
    companiesList = signal<any[]>([]);
    jobRoleDropdownOpen = signal(false);
    showAllJobRoles = signal(false);

    // Variabile per memorizzare i dati originali, utile per verificare se ci sono state modifiche
    private OriginalData: string = '';

    // Headers dinamici basati su RISORSE_HEADERS, escludendo campi non editabili come 'id' e 'isActive'
    readonly headers = (Object.entries(EMPLOYEES_HEADERS) as [keyof Employee, string][])
        .filter(([key]) => key !== 'id' && key !== 'isActive') 
        .map(([key, label]) => ({ key, label }));

    ngOnInit() {
        const caricamenti = [
            this.rolesService.loadAllJobRoles(),
            this.rolesService.loadJobRoleLevels(),
            this.lookupsService.loadAvailableCompanies()
        ];

        forkJoin(caricamenti).subscribe({
            next: (risultati) => {
                this.jobRolesList.set(risultati[0]);
                this.jobRolesLevelsList.set(risultati[1]);
                this.companiesList.set(risultati[2]);
            }, 
            error: (error) => {
                this.statusMessage = { text: 'Errore durante il caricamento dei dati: ' + error.message, type: 'error' };
            }
        });

        this.formData = { ...this.baseData };
        this.OriginalData = JSON.stringify(this.formData);
    }

    // Reagiamo ai cambiamenti dell'input `risorsaDaAggiungere`
    private syncRisorsa = effect(() => {
        const r = this.selectedEmployeeToAdd();
        if (!r) return;
        
        this.baseData = JSON.parse(JSON.stringify(r));
        const normalized = normalizeEmployeeForForm(this.baseData);
        
        console.log('Nuova Risorsa: dati ricevuti:', r, '-> normalizzati:', normalized);
        
        this.formData = { ...normalized };
        this.OriginalData = JSON.stringify(this.formData);
    });

    getOptions(key: string): any[] {
        switch (key) {
            case 'jobRole': return this.jobRolesList();
            case 'jobRoleLevel': return this.jobRolesLevelsList();
            case 'company': return this.companiesList();
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
            return this.jobRolesList();
        }

        return this.jobRolesList().filter((role) =>
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
            roles: this.jobRolesList(),
            levels: this.jobRolesLevelsList(),
            companies: this.companiesList(),
        });

        this.employeesService.addEmployee(backendPayload).subscribe({
            next: () => {
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.statusMessage = { text: 'Risorsa aggiunta con successo!', type: 'success' };
                this.added.emit(uiFallback);
                form.resetForm();
                this.formData = {};
                this.cancel.emit();
            },
            error: (error: any) => {
                this.attemptedSubmit = true;
                let errorMessage = 'Errore durante l\'aggiunta della risorsa';
                
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
        return toElementId('risorsa', key, i);
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
