import { Component, DestroyRef, HostListener, computed, effect, inject, signal, OnInit } from '@angular/core';
import { Role } from '../../shared/models/role.model';
import { RolesService } from '../../shared/services/roles.service';
import { Router } from '@angular/router';
import { RoleResourcesComponent } from './role-resources/role-resources.component';
import { NewRoleComponent } from "./new-role/new-role.component";
import { RoleRowComponent } from './role/role.component';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, tap, Subject, timer, switchMap, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModificaRoleComponent } from './edit-role/edit-role.component';
import { AssignEmployeeComponent } from './role/assign-employees/assign-employees.component';
import { EmployeesService } from '../../shared/services/employees.service';
import { AppButtonComponent } from '../../shared/button/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { NotifyAction } from '../../shared/enums/notify.enum';
import { getHttpErrorStatusMessage } from '../../shared/utils/http-error-message.utils';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss'],
  standalone: true,
  imports: [
    RoleResourcesComponent,
    NewRoleComponent,
    RoleRowComponent,
    MatPaginatorModule,
    ReactiveFormsModule,
    ModificaRoleComponent,
    AssignEmployeeComponent,
    AppButtonComponent,
    MatProgressSpinnerModule
  ],
})
export class RolesComponent implements OnInit {
    isFetching = signal(false);
    error = signal<string | null>(null);
    
    private rolesService = inject(RolesService);
    private employeesService = inject(EmployeesService);
    private destroyRef = inject(DestroyRef);
    private snackbarService = inject(SnackbarService);
    
    private showMessage$ = new Subject<{ text: string, type: 'success' | 'error' }>();

    isInitialLoading = signal(this.rolesService.loadedJobRoles().length === 0);
    statusMessage = signal<{ text: string, type: 'success' | 'error' } | null>(null);

    listAllJobRoles = this.rolesService.loadedAllJobRoles;
    roles = this.rolesService.loadedJobRoles;

    filteredRoles = computed<Role[]>(() => {
        const rolesData = this.roles() ?? [];
        const AllRolesData = this.listAllJobRoles() ?? [];
        const filtro = this.filterNameValue().toLowerCase();

        // Esclude'Unassigned' dalla lista dei ruoli principali
        const visibleRoles = rolesData.filter(r => (r?.name || '').toString().trim().toLowerCase() !== 'unassigned');

        if (!filtro) return visibleRoles;

        // Coi filtri, prendiamo comunque TUTTI i ruoli
        return AllRolesData.filter(r => (r?.name || '').toString().toLowerCase().includes(filtro));
    });

    filterNameValue = signal<string>('');
    filterNameRole = new FormControl('');
    roleFilterDropdownOpen = signal(false);
    showAllRoleOptions = signal(false);

    roleFilterOptions = computed<Role[]>(() => {
        const term = this.showAllRoleOptions() ? '' : this.filterNameValue().toLowerCase();
        const rolesData = this.listAllJobRoles() ?? [];

        if (!term) return rolesData;

        return rolesData.filter(role => this.optionName(role).toLowerCase().includes(term));
    });

    isAddingRoleState = signal<boolean | null>(null);
    editingRole = signal<Role | null>(null);
    assigningRole = signal<Role | null>(null);
    addingRole = signal<Role | null>(null);

    selectedRoleId = signal<string | null>(null);
    selectedRole = signal<any | null>(null);
    filteredSelectedEmployees = signal<any[]>([]);

    currentPage = signal(this.rolesService.paginationData()?.currentPage || 1);
    pageSize = this.rolesService.paginationData()?.pageSize || 10;
    pagination = this.rolesService.paginationData;

    assigningRoleEmployees = computed<any[]>(() => {
        const ruolo = this.assigningRole();
        if (!ruolo) return [];

        const tutteLeRisorse = this.employeesService.loadedAllEmployees() ?? [];
            return tutteLeRisorse.filter(risorsa => 
                risorsa.jobRole === ruolo.id || risorsa.jobRole === ruolo.name
            );
    });

    constructor(private router: Router) {
        effect(() => {
        console.log('IL SEGNALE È CAMBIATO! Nuova lista:', this.roles());
        });

        effect(() => {
        const employees = this.employeesService.loadedAllEmployees();
        const ruolo = this.selectedRole();
        
        if (ruolo) {
            const risorseFiltrate = (employees || [])
                .filter(risorsa => risorsa.jobRole === ruolo.id || risorsa.jobRole === ruolo.name);
            this.filteredSelectedEmployees.set(risorseFiltrate);
        }
        });

        this.showMessage$.pipe(
            tap(msg => this.statusMessage.set(msg)),
            switchMap(() => timer(3000)),
            takeUntilDestroyed()
            ).subscribe(() => {
                this.statusMessage.set(null);
        });
    }

    loadInitialData(forceInitialSpinner = false) {
        const dataAlreadyLoaded = this.rolesService.loadedJobRoles().length > 0;

        this.isFetching.set(true);
        this.isInitialLoading.set(forceInitialSpinner || !dataAlreadyLoaded);
        this.error.set(null);

        forkJoin({
            paginatedRoles: this.rolesService.loadJobRoles(this.currentPage(), this.pageSize),
            allRoles: this.rolesService.loadAllJobRoles(),
            employees: this.employeesService.loadAllEmployees(),
            hold: timer(1500) // Aggiunta di un timer per garantire che lo spinner sia visibile per almeno 1.5 secondi
        }).pipe(
            finalize(() => { this.isInitialLoading.set(false); this.isFetching.set(false); }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
            const meta = this.pagination();
            if (meta) {
                this.currentPage.set(meta.currentPage);
                this.pageSize = meta.pageSize;
            }
            },
            error: (err) => {
            this.error.set(this.buildLoadRolesErrorMessage(err));
            this.snackbarService.error(NotifyAction.Caricamento, 'dati iniziali', 'Riprova')
                .onAction().subscribe(() => {
                this.loadInitialData(true); // Se clicco su Riprova, riesegue l'intero blocco di caricamento iniziale, inclusa la paginazione. NOTA: Se vuoi mantenere la pagina corrente, modifica la chiamata per ricaricare solo i ruoli, senza resettare la pagina alla prima
                });
            }
        });
    }

    ngOnInit() {
        this.error.set(null);
        this.loadInitialData();

        this.filterNameRole.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
        ).subscribe(value => {
        this.filterNameValue.set(value?.toLowerCase() || '');
        this.showAllRoleOptions.set(false);
        });

        const ruoloSalvato = this.rolesService.lastRoleSelected();
        if (ruoloSalvato) {
            this.mostraRisorsePerRuolo(ruoloSalvato);
        }
    }

    onPageChange(event: PageEvent) {
        this.pageSize = event.pageSize;
        this.caricaPagina(event.pageIndex + 1);
    }

    caricaPagina(page: number, forceInitialSpinner = false) {
        this.isFetching.set(true);
        this.isInitialLoading.set(forceInitialSpinner);
        this.currentPage.set(page);
        this.error.set(null); 

        this.rolesService.loadJobRoles(page, this.pageSize).pipe(
            finalize(() => {
                this.isFetching.set(false);
                this.isInitialLoading.set(false);
            }),
            takeUntilDestroyed(this.destroyRef)
            ).subscribe({
            next: () => {
                const meta = this.pagination();
                if (meta) {
                this.currentPage.set(meta.currentPage);
                this.pageSize = meta.pageSize;
                }
            },
            error: (err) => {
                this.error.set(this.buildLoadRolesErrorMessage(err));
                // Chiamata diretta al servizio con opzione "Riprova" configurata nell'azione della snackbar
                this.snackbarService.error(NotifyAction.Caricamento, 'ruoli', 'Riprova')
                .onAction().subscribe(() => {
                    this.caricaPagina(page, true);
                });
            },
        });
    }

    ricaricaRuoli() {
        this.isFetching.set(true);
        this.error.set(null);
        this.rolesService.loadJobRoles().pipe(
        finalize(() => this.isFetching.set(false)),
        takeUntilDestroyed(this.destroyRef)
        ).subscribe({
        error: (err) => {
            this.error.set(`Errore durante il ricaricamento dei ruoli: ${getHttpErrorStatusMessage(err)}`);
            this.showNotification('error', NotifyAction.Ricaricamento, 'ruoli');
        }
        });
    }

    aggiornaRuoli() {
        this.isFetching.set(true);
        this.error.set(null);
        
        // RxJS si occupa di gestire l'attesa di 3 secondi prima di far partire la chiamata
        timer(3000).pipe(
        switchMap(() => this.rolesService.loadJobRoles()),
        finalize(() => this.isFetching.set(false)),
        takeUntilDestroyed(this.destroyRef)
        ).subscribe({
        error: (error: Error) => {
            this.error.set(`Errore durante l'aggiornamento dei ruoli: ${getHttpErrorStatusMessage(error)}`);
            this.snackbarService.error(NotifyAction.Ricaricamento, 'ruoli', 'Riprova')
            .onAction().subscribe(() => {
                this.aggiornaRuoli();
            });
        },
        });
    }

    mostraRisorsePerRuolo(ruolo: any) {
        this.selectedRoleId.set(ruolo.id);
        this.selectedRole.set(ruolo);
        const tutteLeRisorse = this.employeesService.loadedAllEmployees() ?? [];
        const risorseFiltrate = tutteLeRisorse
            .filter(risorsa => risorsa.jobRole === ruolo.id || risorsa.jobRole === ruolo.name);

        this.filteredSelectedEmployees.set(risorseFiltrate);
    }

    optionName(option: any): string {
        return option?.name || option?.Name || option || '';
    }

    onRoleFilterFocus() {
        this.showAllRoleOptions.set(true);
        this.roleFilterDropdownOpen.set(true);
    } 

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
        this.closeSidePanel();
    }

    clearRoleFilter() {
        this.filterNameRole.setValue('');
        this.filterNameValue.set('');
        this.roleFilterDropdownOpen.set(false);
        this.showAllRoleOptions.set(false);
        this.closeSidePanel();
    }

    aggiungiRuolo() {
        this.isAddingRoleState.set(false);
        this.showNotification('success', NotifyAction.AddRole);
        this.caricaPagina(1);
    }

    chiudiPannello() {
        // this.selectedRoleId.set(null);
        // this.selectedRole.set(null);
        // this.filteredSelectedEmployees.set([]);
    }

    closeSidePanel() {
        this.selectedRoleId.set(null);
        this.selectedRole.set(null);
        this.filteredSelectedEmployees.set([]);
    }

    apriModifica(r: Role) { this.editingRole.set(r); }
    chiudiModifica() { this.editingRole.set(null); }
    apriAssegnaRisorse(r: Role) { this.assigningRole.set(r); }
    chiudiAssegnaRisorse() { this.assigningRole.set(null); }

    salvaModifica() {
        this.ricaricaRuoli();
        this.editingRole.set(null);
        this.showNotification('success', NotifyAction.UpdateRole);
    }

    salvaAssegnazioneRisorse() {
        this.assigningRole.set(null);
        this.showNotification('success', NotifyAction.Assegnazione, 'risorse');

        const ruolo = this.selectedRole();
        if (ruolo) {
        const filteredEmployees = (this.employeesService.loadedAllEmployees() || [])
            .filter(r => r.isActive !== false)
            .filter(risorsa => risorsa.jobRole === ruolo.id || risorsa.jobRole === ruolo.name);
        this.filteredSelectedEmployees.set(filteredEmployees);
        }
    }

    // Map diretto degli enum di SnackbarService
    showNotification(type: 'success' | 'error', action: NotifyAction, params?: string | string[]) {
        if (type === 'success') {
        this.snackbarService.success(action, params); 
        } else {
        this.snackbarService.error(action, params ?? []); 
        }
    }

    private buildLoadRolesErrorMessage(error: Error): string {
        return `Errore durante il caricamento dei ruoli: ${getHttpErrorStatusMessage(error)}`;
    }
}
