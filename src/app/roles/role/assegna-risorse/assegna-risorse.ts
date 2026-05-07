import { Component, DestroyRef, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { Role } from '../../role.model';
import { Employee } from '../../../risorse/risorse.model';
import { RequestsService } from '../../../shared/requests.service';
import { debounceTime, distinctUntilChanged, forkJoin, tap } from 'rxjs';
import { FormsModule, FormControl, NgForm, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TextInputComponent } from '../../../shared/text-input/text-input';

type RisorsaDaAssegnare = Employee & {
    selectedJobRoleLevel: string;
};

@Component({
  selector: 'app-assegna-risorse',
  templateUrl: './assegna-risorse.html',
  styleUrls: ['../../../shared/form-styles.css',],
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  standalone: true,
})
export class AssegnaRisorseComponent {

    private requests = inject(RequestsService)
    private destroyRef = inject(DestroyRef);


    ruoloSelezionato = input.required<Role>();
    listaRisorseAsssegnate = signal<Employee[]>([]);
    listaRisorseSelezionate = signal<RisorsaDaAssegnare[]>([]);


    listaTotaleRisorse = signal<any[]>([]);
    listaJobRolesLevels = signal<any[]>([]);
    isLoadingLookups = signal(false);


    filtroNomeRisorsa = new FormControl('');
    // filtroLivello = new FormControl('');
    filtroRisorsaValue = signal('');
    // filtroLivelloValue = signal('');
    showAllEmployeeOptions = signal(false);
    // showAllLevelOptions = signal(false);
    employeeDropdownOpen = signal(false);


    fullName(employee: Employee): string {
        return `${employee.name || ''} ${employee.surname || ''}`.trim();
    }

    nameFilterOptions = computed<Employee[]>(() => {
        const term = this.showAllEmployeeOptions() ? '' : this.filtroRisorsaValue();
        const employees = this.listaTotaleRisorse();
        const selectedIds = new Set(this.listaRisorseSelezionate().map((employee) => employee.id));
        const availableEmployees = employees.filter((employee) => !selectedIds.has(employee.id));

        if (!term) {
            return availableEmployees;
        }

        return availableEmployees.filter(employee =>
            this.fullName(employee).toLowerCase().includes(term)
        );
    });


    saved = output<Employee[]>();
    cancel = output<void>();


    attemptedSubmit = false;
    noChangesMessage = false;
    statusMessage: { text: string; type: 'success' | 'error' } | null = null;
    dateRangeError = false;


    private dataOriginale: string = '';
    private initialDataObj: any = null; // Ci serve per il CSS (vedi sotto)
    formData: any = {};


    ngOnInit() {
        this.isLoadingLookups.set(true);

        const ra = this.listaRisorseAsssegnate();
        const risorseAssegnate = JSON.parse(JSON.stringify(ra)) as Employee[];
        this.listaRisorseSelezionate.set(
            risorseAssegnate.map((risorsa) => ({
                ...risorsa,
                selectedJobRoleLevel: risorsa.jobRoleLevel || '',
            }))
        );
        this.formData = {};

        const caricamenti = {
            employees: this.requests.caricaTuttiEmployeesDisponibili(),
            levels: this.requests.caricaJobRoleLevelsDisponibili(),
            companies: this.requests.caricaAziendeDisponibili(),
        };

        forkJoin(caricamenti).subscribe({
            next: (risultati) => {
                this.listaTotaleRisorse.set(risultati.employees);
                this.listaJobRolesLevels.set(risultati.levels);
                this.isLoadingLookups.set(false);
            },
            error: (error) => {
                this.isLoadingLookups.set(false);
                this.statusMessage = {
                    text: 'Errore durante il caricamento dei dati necessari: ' + error.message,
                    type: 'error',
                };
            },
        })

        this.dataOriginale = JSON.stringify(this.formData);
        this.initialDataObj = JSON.parse(this.dataOriginale);

        const filterSubscription = this.filtroNomeRisorsa.valueChanges.pipe(
            debounceTime(250),
            distinctUntilChanged(),
            tap(value => {
                this.filtroRisorsaValue.set((value || '').toLowerCase());
                this.showAllEmployeeOptions.set(false);
            })
        ).subscribe();

        this.destroyRef.onDestroy(() => {
            filterSubscription.unsubscribe();
        });

    }

    onEmployeeFilterFocus() {
        this.showAllEmployeeOptions.set(true);
        this.employeeDropdownOpen.set(true);
    }

    onEmployeeFilterInput() {
        this.showAllEmployeeOptions.set(false);
        this.employeeDropdownOpen.set(true);
    }

    toggleEmployeeFilterDropdown() {
        this.showAllEmployeeOptions.set(true);
        this.employeeDropdownOpen.update(open => !open);
    }

    selectEmployeeFilter(employee: Employee) {
        const alreadySelected = this.listaRisorseSelezionate().some((selected) => selected.id === employee.id);

        if (!alreadySelected) {
            this.listaRisorseSelezionate.update((selected) => [
                ...selected,
                {
                    ...employee,
                    selectedJobRoleLevel: employee.jobRoleLevel || '',
                },
            ]);
        }

        this.filtroNomeRisorsa.setValue('');
        this.filtroRisorsaValue.set('');
        this.employeeDropdownOpen.set(false);
        this.showAllEmployeeOptions.set(false);
        this.onFieldChange();
    }

    clearNameFilter() {
        this.filtroNomeRisorsa.setValue('');
        this.filtroRisorsaValue.set('');
        this.employeeDropdownOpen.set(false);
        this.showAllEmployeeOptions.set(false);
    }

    isChanged(): boolean {
        console.log("Comparing current form data with original:");
        console.log("Current:", this.formData);
        console.log("Original:", this.initialDataObj);
        return JSON.stringify(this.formData) !== this.dataOriginale;
    }

    isFieldChanged(key: string): boolean {
        if (!this.initialDataObj) return false;
        return JSON.stringify(this.formData[key]) !== JSON.stringify(this.initialDataObj[key]);
    }

      hasValidResources(): boolean {
        const risorse = this.listaRisorseSelezionate();
        if (!risorse || risorse.length === 0) return true;
        return risorse.every((r: any) => 
        !!r.id && !!r.selectedJobRoleLevel
        );
    }

    isSubmitDisabled(form: NgForm): boolean {
        return this.isLoadingLookups() || form.invalid || this.listaRisorseSelezionate().length === 0 || !this.hasValidResources();
    }

    onSubmitClick(form: NgForm, event: Event) {
        // Se non ci sono cambiamenti, blocchiamo il submit e mostriamo un messaggio
        if (this.listaRisorseSelezionate().length === 0) {
        event.preventDefault();
        this.noChangesMessage = true;
        return;
        }

        if (form.invalid || !this.hasValidResources()) {
        // Se il form è invalido o i ruoli non sono completi, blocchiamo il submit e mostriamo un messaggio
        event.preventDefault();
        this.attemptedSubmit = true;
        }
    }
    
    submit(form: NgForm) {
        if (form.invalid) {
            return;
        }

        const risorseSelezionate = this.listaRisorseSelezionate();

        if (risorseSelezionate.length === 0) {
            this.attemptedSubmit = true;
            this.statusMessage = { text: 'Seleziona almeno una risorsa da assegnare.', type: 'error' };
            return;
        }

        //Ricaviamo Ruolo e Livello
        const nuovoRuolo = this.ruoloSelezionato().name;

        //attribuiamo Ruolo e Livello alle singole risorseSelezionate tramite mapping
        const risorseAggiornate: Employee[] = risorseSelezionate.map((risorsa) => ({
            ...risorsa,
            jobRole: nuovoRuolo,
            jobRoleLevel: risorsa.selectedJobRoleLevel,
            company: risorsa.company
        }));

        const richiesteAggiornamento = risorseAggiornate.map((risorsa) =>
            this.requests.aggiornaEmployee(risorsa) // Il mapping attribuirà una richiesta di aggiornamento ad ogni risorsa di risorseAggiornate
        );

        forkJoin(richiesteAggiornamento).subscribe({ //Sottoscrizione alle singole richieste di aggiornamento tramite forkJoin
            next: () => {
                this.attemptedSubmit = false;
                this.noChangesMessage = false;
                this.statusMessage = { text: 'Risorse assegnate con successo!', type: 'success' };
                this.saved.emit(risorseAggiornate);
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

    removeSelectedResource(employeeId: string) {
        this.listaRisorseSelezionate.update((selected) =>
            selected.filter((employee) => employee.id !== employeeId)
        );
        this.onFieldChange();
    }

    updateSelectedLevel(employeeId: string, level: string) {
        this.listaRisorseSelezionate.update((selected) =>
            selected.map((employee) =>
                employee.id === employeeId
                    ? { ...employee, selectedJobRoleLevel: level }
                    : employee
            )
        );
        this.onFieldChange();
    }

    getOptions(key: string): any[] {
        switch (key) {
            case 'jobRoleLevel': return this.listaJobRolesLevels();
            case 'employees': return this.listaTotaleRisorse();
            default: return [];
        }
    }

    toId(key: string, i: number): string {
        return `risorsa-${i}-${key}`
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .toLowerCase();
    }

    getRequiredErrorMessage(key: string): string {
        const messages: Record<string, string> = {
            name: 'Nome obbligatorio',
            surname: 'Cognome obbligatorio'
        };
        return messages[key] || 'Campo obbligatorio';
    }


    onFieldChange() {
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.statusMessage = null;
    }

    optionName(option: any): string {
        return option?.name || option?.Name || option || '';
    }

    @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent) {
        const target = event.target as Element | null;

        if (!target?.closest('.resource-name-filter-combo')) {
            this.employeeDropdownOpen.set(false);
            this.showAllEmployeeOptions.set(false);
        }
    }

}
