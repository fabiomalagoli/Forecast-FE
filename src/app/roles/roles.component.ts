import { Component, DestroyRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Role } from '../shared/models/role.model';
import { RolesService } from '../shared/services/roles.service';
import { Router } from '@angular/router';
import { RoleResourcesComponent } from './role-resources/role-resources.component';
import { NewRoleComponent } from "./new-role/new-role.component";
import { RoleRowComponent } from './role/role.component';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, tap } from 'rxjs';
import { ModificaRoleComponent } from './edit-role/edit-role.component';
import { AssignEmployeeComponent } from './role/assign-employees/assign-employees.component';
import { Employee } from '../shared/models/employee.model';
import { EmployeesService } from '../shared/services/employees.service';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrls: ['../shared/filter-styles.css', './roles.component.css'],
  imports: [RoleResourcesComponent, NewRoleComponent, RoleRowComponent, MatPaginatorModule, ReactiveFormsModule, ModificaRoleComponent, AssignEmployeeComponent],
})
export class RolesComponent {
    isFetching = signal(false);
    error = signal('');
    private rolesService = inject(RolesService);
    private employeesService = inject(EmployeesService)
    private destroyRef = inject(DestroyRef);
    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

    listAllJobRoles = this.rolesService.loadedAllJobRoles;
    roles = this.rolesService.loadedJobRoles;

    filteredRoles = computed<Role[]>(() => {
        const rolesData = this.roles() ?? [];
        const AllRolesData = this.listAllJobRoles() ?? [];
        const filtro = this.filterNameValue().toLowerCase();

        if (!filtro) {
            return rolesData; // Mi dai solo quelli impaginati
        }

        return AllRolesData.filter(r => 
            r.name.toLowerCase().includes(filtro) // Questo perchè mi devi fare il filtro su tutto quanto
        );
    }); // Invece di metterlo nel constructor, lo rendiamo computed per tener traccia dei cambiamenti
        // A seconda dei valori di rolesData, AllRolesData e filtro


    employeesList = signal<any[]>([]);


    roleName = signal<string | null>(null);
    filterNameValue = signal<string>('');
    filterNameRole = new FormControl('');
    roleFilterDropdownOpen = signal(false);
    showAllRoleOptions = signal(false);
    filterData: any = {};

    roleFilterOptions = computed<Role[]>(() => {
        const term = this.showAllRoleOptions()
            ? ''
            : this.filterNameValue().toLowerCase();
        const rolesData = this.listAllJobRoles() ?? [];

        if (!term) {
            return rolesData;
        }

        return rolesData.filter(role =>
            this.optionName(role).toLowerCase().includes(term)
        );
    });


    isAddingRoleState = signal<boolean | null>(null);


    editingRole = signal<Role | null>(null);
    addingRole = signal<Role | null>(null);
    assigningRole = signal<Role | null>(null);


    selectedRoleId = signal<string | null>(null);
    selectedRole = signal<any | null>(null);
    filteredSelectedEmployees = signal<any[]>([]);


    currentPage = signal(1);
    pageSize = 10;
    pagination = this.rolesService.paginationData; // Variabili per l'impaginazione


    constructor(private router: Router) {
        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Nuova lista:', this.roles());
        });

        // Quando gli employees vengono aggiornati nel service, filtra automaticamente
        effect(() => {
            const employees = this.employeesService.loadedAllEmployees();
            const ruolo = this.selectedRole();
            
            if (ruolo) {
                const risorseFiltrate = employees.filter(risorsa => {
                    return risorsa.jobRole === ruolo.id || risorsa.jobRole === ruolo.name;
                });
                this.filteredSelectedEmployees.set(risorseFiltrate);
            }
        });
    }

    onPageChange(event: PageEvent){
        const nextPage = event.pageIndex + 1;
        const nextPageSize = event.pageSize;

        this.pageSize = nextPageSize;
        this.caricaPagina(nextPage);
    }

    caricaPagina(page: number) {
        this.isFetching.set(true);
        this.currentPage.set(page);
        this.chiudiPannello();

        this.rolesService.loadJobRoles(page, this.pageSize).pipe(
            finalize(() => this.isFetching.set(false))
        ).subscribe({
            next: () => {
                const meta = this.pagination();
                if (meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
                this.statusMessage.set({text: 'Ruoli caricati con successo!', type: 'success'});
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento dei ruoli: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il caricamento dei ruoli', type: 'error'});
            },
        });
    }

    nextPage() {
        const meta = this.pagination();
        if (meta?.hasNext) {
            this.caricaPagina(meta.currentPage + 1);
        }
    }

    prevPage() {
        const meta = this.pagination();
        if (meta?.hasPrevious) {
            this.caricaPagina(meta.currentPage - 1);
        }
    }

    ngOnInit() {
        this.isFetching.set(true);
        const subscription = this.rolesService.loadJobRoles(this.currentPage(), this.pageSize).pipe(
            finalize(() => this.isFetching.set(false))
        ).subscribe({
            next: () => {
                const meta = this.pagination();
                if (meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
                this.statusMessage.set({text: 'Ruoli caricati con successo!', type: 'success'});
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento dei ruoli: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il caricamento dei ruoli', type: 'error'});
            },
        });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });

        const risorseSubscription = this.employeesService.loadAllEmployees().subscribe({
            next: () => {
                this.statusMessage.set({text: 'Risorse caricate con successo!', type: 'success'});
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento delle risorse: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il caricamento delle risorse', type: 'error'});
            },
        });

        this.destroyRef.onDestroy(() => {
            risorseSubscription.unsubscribe();
        });

        //Imnplementiamo la funzione di filtro ed i listeners

        this.filterNameRole.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            tap(value => {
                this.filterNameValue.set(value?.toLowerCase() || '');
                this.showAllRoleOptions.set(false);
                this.chiudiPannello();
            })
        ).subscribe();

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });

        //carichiamo tutti i JobRoles, volendo applicare il filtro per tutti quelli presenti e non solo quelli impaginati
        //solo sottoscrivendoci (avendo già allJobRoles nel file request.service.ts) alla chiamata API relativa

        const allJobRolesSuibscription = this.rolesService.loadAllJobRoles().subscribe({
            error: (err) => {
                this.error.set('Errore durante il caricamento di tutti i ruoli: ' + err.message);
            }
        });

        this.destroyRef.onDestroy(() => {
            allJobRolesSuibscription.unsubscribe()
        });

        const ruoloSalvato = this.rolesService.lastRoleSelected();

        if(ruoloSalvato){
            this.mostraRisorsePerRuolo(ruoloSalvato);
        }


    }

    ricaricaRuoli() {
        this.isFetching.set(true);
        const subscription = this.rolesService.loadJobRoles().pipe(
            finalize(() => this.isFetching.set(false))
        ).subscribe({
            next: () => {
                this.statusMessage.set({text: 'Ruoli caricati con successo!', type: 'success'});
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento dei ruoli: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il caricamento dei ruoli', type: 'error'});
            }
        });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });
    }

    aggiornaRuoli(){
        this.isFetching.set(true);
        const timeoutId = setTimeout(() => {
        const subscription = this.rolesService.loadJobRoles().pipe(
                finalize(() => this.isFetching.set(false))
            )
            .subscribe({ 
            error: (error: Error) => {
                this.error.set(error.message);
            },
            });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });
        }, 3000); // Ritardo di 3 secondi prima della richiesta

        this.destroyRef.onDestroy(() => {
        clearTimeout(timeoutId);
        });
    }

    mostraRisorsePerRuolo(ruolo: any) {
        this.selectedRoleId.set(ruolo.id);
        this.selectedRole.set(ruolo);
        
        const tutteLeRisorse = this.employeesService.loadedAllEmployees();
        
        console.log('Ruolo cliccato:', ruolo);
        console.log('Prima risorsa dell array (per capire la struttura):', tutteLeRisorse[0]);
        
        const risorseFiltrate = tutteLeRisorse.filter(risorsa => {
            return risorsa.jobRole === ruolo.id || 
                risorsa.jobRole === ruolo.name;
        });
        
        console.log('Risorse trovate dal filtro:', risorseFiltrate);
        
        this.filteredSelectedEmployees.set(risorseFiltrate);
        
        if(risorseFiltrate.length === 0) {
            this.statusMessage.set({text: 'Nessuna risorsa trovata per questo ruolo', type: 'error'});
        }
    }

    optionName(option: any): string {
        return option?.name || option?.Name || option || '';
    }

    onRoleFilterFocus() {
        this.showAllRoleOptions.set(true);
        this.roleFilterDropdownOpen.set(true);
    } //

    onRoleFilterInput() {
        this.showAllRoleOptions.set(false);
        this.roleFilterDropdownOpen.set(true);
    }

    toggleRoleFilterDropdown() {
        this.showAllRoleOptions.set(true);
        this.roleFilterDropdownOpen.update(open => !open);
    }

    @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent) {
        const target = event.target as Element | null;

        if (!target?.closest('.role-filter-combo')) {
            this.roleFilterDropdownOpen.set(false);
            this.showAllRoleOptions.set(false);
        }
    }

    selectRoleFilter(role: Role) {
        const roleName = this.optionName(role);
        this.filterNameRole.setValue(roleName);
        this.filterNameValue.set(roleName.toLowerCase());
        this.roleFilterDropdownOpen.set(false);
        this.showAllRoleOptions.set(false);
        this.chiudiPannello();
    }

    clearRoleFilter() {
        this.filterNameRole.setValue('');
        this.filterNameValue.set('');
        this.roleFilterDropdownOpen.set(false);
        this.showAllRoleOptions.set(false);
        this.chiudiPannello();
    }

    aggiungiRuolo(newRole: any) {
        this.isAddingRoleState.set(false);
        this.statusMessage.set({text: 'Ruolo aggiunto con successo!', type: 'success'});
        // Ricarica la lista dalla pagina 1 dopo la creazione
        this.currentPage.set(1);
        this.caricaPagina(1);
    }

    chiudiPannello() {
        this.selectedRoleId.set(null);
        this.selectedRole.set(null);
        this.filteredSelectedEmployees.set([]);
    }

    apriModifica(r: Role) {
        this.editingRole.set(r);
    }

    chiudiModifica() {
        this.editingRole.set(null);
    }

    apriAssegnaRisorse(r: Role) {
        this.assigningRole.set(r);
    }

    chiudiAssegnaRisorse() {
        this.assigningRole.set(null);
    }

    salvaModifica(roleAggiornato: Role) {
        this.ricaricaRuoli();
        this.editingRole.set(null);
        this.showNotification('Ruolo aggiornato con successo!', 'success');
    }

    salvaAssegnazioneRisorse(risorseAggiornate: Employee[]) {
        this.assigningRole.set(null);
        this.showNotification('Risorse assegnate con successo!', 'success');

        const ruolo = this.selectedRole();
        if (ruolo) {
            const filteredEmployees = this.employeesService.loadedAllEmployees().filter(risorsa =>
                risorsa.jobRole === ruolo.id || risorsa.jobRole === ruolo.name
            );
            this.filteredSelectedEmployees.set(filteredEmployees);
        }
    }

    showNotification(text: string, type: 'success' | 'error') {
        this.statusMessage.set({ text, type });
        setTimeout(() => this.statusMessage.set(null), 3000);
    }

}
