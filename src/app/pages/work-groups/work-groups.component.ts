import { Component, computed, DestroyRef, effect, HostListener, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { WorkGroupsService } from '../../shared/services/workgroups.service';
import { EmployeesService } from '../../shared/services/employees.service';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, Subject, switchMap, tap, timer } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Employee } from '../../shared/models/employee.model';
import { WorkGroup } from '../../shared/models/workgroups.model';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageEvent } from '@angular/material/paginator';
import { ConfirmDeleteDialogComponent } from '../../shared/components/confirm-delete-dialog/confirm-delete-dialog';
import { NotifyAction } from '../../shared/enums/notify.enum';
import { getHttpErrorStatusMessage } from '../../shared/utils/http-error-message.utils';
import { WorkGroupResourcesComponent } from "./work-group-resources/work-group-resources.component";
import { NewWorkGroupComponent } from "./new-work-group/new-work-group.component";
import { ModificaWorkGroupComponent } from "./edit-work-group/edit-work-group.component";
import { WorkGroupRowComponent } from './work-group/work-group.component';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { EditEmployeeForRoleComponent } from "./work-group-resources/edit-employee-for-work-group/edit-employee-for-work-group.component";
import { AssignEmployeeComponent } from "./work-group/assign-employees/assign-employees-work-groups.component";


@Component({
  selector: 'app-work-groups',
  standalone: true,
  imports: [
    WorkGroupResourcesComponent,
    NewWorkGroupComponent,
    ModificaWorkGroupComponent,
    WorkGroupRowComponent,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    EditEmployeeForRoleComponent,
    AssignEmployeeComponent
],
  templateUrl: 'work-groups.component.html',
  styleUrl: 'work-groups.component.scss'
})

export class WorkGroupsComponent {
    isFetching = signal(false);
    error = signal<string | null>(null);
    
    private workGroupsService = inject(WorkGroupsService);
    private employeesService = inject(EmployeesService);
    private destroyRef = inject(DestroyRef);
    private snackbarService = inject(SnackbarService);
    private dialog = inject(MatDialog);
    
    private showMessage$ = new Subject<{ text: string, type: 'success' | 'error' }>();
    private isFromDetails = signal(false);

    isInitialLoading = signal(this.workGroupsService.loadedWorkGroups().length === 0);
    statusMessage = signal<{ text: string, type: 'success' | 'error' } | null>(null);

    deletingWorkGroupId = signal<string | null>(null);
    selectedRolesIds = signal<string[]>([]);

    listAllWorkGroups = this.workGroupsService.loadedAllworkGroups;
    workGroups = this.workGroupsService.loadedWorkGroups;

    // filteredRoles = computed<Role[]>(() => { return this.roles().filter(r => !r.isEliminated); });
    selectedEmployeeForDrawer = signal<any | null>(null);

    editingEmployee = signal<Employee | null>(null);

    filterNameValue = signal<string>('');
    filterNameWorkGroup = new FormControl('');
    workGroupFilterDropdownOpen = signal(false);
    showAllWorkGroupOptions = signal(false);

    workGroupFilterOptions = computed<WorkGroup[]>(() => {
        const term = this.showAllWorkGroupOptions() ? '' : this.filterNameValue().toLowerCase();
        const workGroupData = this.listAllWorkGroups() ?? [];

        if (!term) return workGroupData;

        return workGroupData.filter(role => this.optionName(role).toLowerCase().includes(term));
    });

    isAddingWorkGroupState = signal<boolean | null>(null);
    editingWorkGroup = signal<WorkGroup | null>(null);;
    assigningWorkGroup = signal<WorkGroup | null>(null);
    addingWorkGroup = signal<WorkGroup | null>(null);

    selectedWorkGroupId = signal<string | null>(null);
    selectedWorkGroup = signal<WorkGroup | null>(null);
    filteredSelectedEmployees = signal<any[]>([]);

    currentPage = signal(this.workGroupsService.paginationData()?.currentPage || 1);
    pageSize = this.workGroupsService.paginationData()?.pageSize || 10;
    pagination = this.workGroupsService.paginationData;
    currentFilters = signal({
        searchTerm: null as string | null
    });

    assigningWorkGroupEmployees = computed<any[]>(() => {
        const gruppo = this.assigningWorkGroup();
        if (!gruppo) return [];

        const tutteLeRisorse = this.employeesService.loadedAllEmployees() ?? [];
            return tutteLeRisorse.filter(risorsa => 
                risorsa.jobRole === gruppo.id || risorsa.jobRole === gruppo.name
            );
    });

    constructor(private router: Router) {

        const currentNav = this.router.currentNavigation();
        const previousUrl = currentNav?.previousNavigation?.finalUrl?.toString() || null;

        this.isFromDetails.set(previousUrl?.includes(`/workgroups/`) ?? false);

        if(!this.isFromDetails()) {
            (this.workGroupsService as any).currentFilters = {
                searchTerm: null as string | null
            };
            if (typeof (this.workGroupsService as any).clearLastRoleSelected === 'function') {
                (this.workGroupsService as any).clearLastRoleSelected();
            }
        }

        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Nuova lista:', this.workGroups());
        });

        effect(() => {
            const tutteLeRisorse = this.employeesService.loadedAllEmployees() ?? [];
            const gruppo = this.selectedWorkGroup();
            
            if (gruppo && gruppo.employees) {
                const idsAssociati = gruppo.employees.map(e => e.employeeId);
                const risorseComplete = tutteLeRisorse.filter(emp => idsAssociati.includes(emp.id));
                this.filteredSelectedEmployees.set(risorseComplete);
            } else {
                this.filteredSelectedEmployees.set([]);
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
        const dataAlreadyLoaded = this.workGroupsService.loadedWorkGroups().length > 0;

        this.isFetching.set(true);
        this.isInitialLoading.set(forceInitialSpinner || !dataAlreadyLoaded);
        this.error.set(null);

        if(!dataAlreadyLoaded) {

          forkJoin({
              // filteredRoles: this.workGroupsService.loadWorkGroups(this.currentPage(), this.pageSize, this.currentFilters()),
              allRoles: this.workGroupsService.loadAllWorkGroupsTest(),
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
        else{

          forkJoin({
              // filteredRoles: this.workGroupsService.loadWorkGroups(this.currentPage(), this.pageSize, this.currentFilters()),
              allRoles: this.workGroupsService.loadAllWorkGroupsTest(),
              employees: this.employeesService.loadAllEmployees(),
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
    }

    ngOnInit() {
        this.error.set(null);

        const savedTerm = (this.workGroupsService as any).currentFilters?.searchTerm || null;

        if (savedTerm) {
            this.currentFilters.set({ searchTerm: savedTerm });
            this.filterNameWorkGroup.setValue(savedTerm, { emitEvent: false });
            this.filterNameValue.set(savedTerm.toLowerCase());
        }
        else {
            this.currentFilters.set({ searchTerm: null });
            this.filterNameWorkGroup.setValue('', { emitEvent: false });
            this.filterNameValue.set('');
        }

        this.loadInitialData();

        this.filterNameWorkGroup.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef)
            ).subscribe(value => {
            this.filterNameValue.set(value?.toLowerCase() || '');
            this.showAllWorkGroupOptions.set(false);
        });

        const gruppoSalvato = this.workGroupsService.lastWorkGroupSelected();
        if (gruppoSalvato && this.isFromDetails()) {
            this.mostraRisorsePerGruppo(gruppoSalvato);
        }
        else {
            this.closeSidePanel();
        }
    }

    // onPageChange(event: PageEvent) {
    //     this.pageSize = event.pageSize;
    //     this.caricaPagina(event.pageIndex + 1);
    // }

    onDeleteWorkGroup(workGroup: WorkGroup): void {
        const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
        data: {
            name: workGroup.name,
            entityLabel: 'il gruppo'
        },
        disableClose: true // Impedisce di chiuderlo cliccando fuori per errore
        });

        // Risultato alla chiusura del form
        dialogRef.afterClosed().subscribe((confirmed: boolean) => {
        if (confirmed) {
            this.deletingWorkGroupId.set(workGroup.id)
            this.onWorkGroupDeleted();
        }
        });
    }

    onWorkGroupDeleted(): void {
        const idToDelete = this.deletingWorkGroupId();
        if(idToDelete === null) return;

        this.isFetching.set(true);
        this.workGroupsService.toggleEliminatedState(idToDelete, true).pipe(
        finalize(() => 
            {
            this.isFetching.set(false);
            this.deletingWorkGroupId.set(null);
            }
        ),
        takeUntilDestroyed(this.destroyRef)
        ).subscribe({
        next: () => {
            this.snackbarService.success(NotifyAction.Eliminazione, 'ruoli');
            // this.caricaPagina(this.currentPage());
        },
        error: () => {
            this.snackbarService.error(NotifyAction.Eliminazione, 'gruppo', 'Chiudi');
        }
        })
    }

    // TO-DO: Implementazione lato backend dell'impaginazione dei gruppi di lavoro
    // caricaPagina(page: number, forceInitialSpinner = false) {
    //     this.isFetching.set(true);
    //     this.isInitialLoading.set(forceInitialSpinner);
    //     this.currentPage.set(page);
    //     this.error.set(null); 

    //     this.workGroupsService.loadJobRoles(page, this.pageSize, this.currentFilters()).pipe(
    //         finalize(() => {
    //             this.isFetching.set(false);
    //             this.isInitialLoading.set(false);
    //         }),
    //         takeUntilDestroyed(this.destroyRef)
    //         ).subscribe({
    //         next: () => {
    //             const meta = this.pagination();
    //             if (meta) {
    //             this.currentPage.set(meta.currentPage);
    //             this.pageSize = meta.pageSize;
    //             }
    //         },
    //         error: (err) => {
    //             this.error.set(this.buildLoadRolesErrorMessage(err));
    //             // Chiamata diretta al servizio con opzione "Riprova" configurata nell'azione della snackbar
    //             this.snackbarService.error(NotifyAction.Caricamento, 'ruoli', 'Riprova')
    //             .onAction().subscribe(() => {
    //                 this.caricaPagina(page, true);
    //             });
    //         },
    //     });
    // }

    ricaricaGruppi() {
        this.isFetching.set(true);
        this.error.set(null);
        // TO-DO: Implementazione impaginazione lato backend
        // this.workGroupsService.loadJobRoles(1, this.pageSize, this.currentFilters()).pipe(
        // finalize(() => this.isFetching.set(false)),
        // takeUntilDestroyed(this.destroyRef)
        // ).subscribe({
        // error: (err) => {
        //     this.error.set(`Errore durante il ricaricamento dei ruoli: ${getHttpErrorStatusMessage(err)}`);
        //     this.showNotification('error', NotifyAction.Ricaricamento, 'ruoli');
        // }
        // });
        this.workGroupsService.loadAllWorkGroupsTest().pipe(
        finalize(() => this.isFetching.set(false)),
        takeUntilDestroyed(this.destroyRef)
        ).subscribe({
        error: (err) => {
            this.error.set(`Errore durante il ricaricamento dei gruppi: ${getHttpErrorStatusMessage(err)}`);
            this.showNotification('error', NotifyAction.Ricaricamento, 'ruoli');
        }
        });
    }

    // TO-DO
    // aggiornaRuoli() {
    //     this.isFetching.set(true);
    //     this.error.set(null);
        
    //     // RxJS si occupa di gestire l'attesa di 3 secondi prima di far partire la chiamata
    //     timer(3000).pipe(
    //     switchMap(() => this.workGroupsService.loadJobRoles(1, this.pageSize, this.currentFilters())),
    //     finalize(() => this.isFetching.set(false)),
    //     takeUntilDestroyed(this.destroyRef)
    //     ).subscribe({
    //     error: (error: Error) => {
    //         this.error.set(`Errore durante l'aggiornamento dei ruoli: ${getHttpErrorStatusMessage(error)}`);
    //         this.snackbarService.error(NotifyAction.Ricaricamento, 'ruoli', 'Riprova')
    //         .onAction().subscribe(() => {
    //             this.aggiornaRuoli();
    //         });
    //     },
    //     });
    // }

    safeEditingEmployee() {
        this.editingEmployee.set(null);
        const role = this.selectedWorkGroup();
        if(role) {
            this.mostraRisorsePerGruppo(role);
        }
        this.snackbarService.success(NotifyAction.Aggiornamento, 'risorsa');
    }

    mostraRisorsePerGruppo(gruppo: WorkGroup) {
        this.selectedWorkGroupId.set(gruppo.id);
        this.selectedWorkGroup.set(gruppo);
        
        const tutteLeRisorse = this.employeesService.loadedAllEmployees() ?? [];
        
        if (gruppo.employees) {
            const idsAssociati = gruppo.employees.map(e => e.employeeId);
            const risorseComplete = tutteLeRisorse.filter(emp => idsAssociati.includes(emp.id));
            this.filteredSelectedEmployees.set(risorseComplete);
        } else {
            this.filteredSelectedEmployees.set([]);
        }
    }

    optionName(option: any): string {
        return option?.name || option?.Name || option || '';
    }

    onWorkGroupFilterFocus() {
        this.showAllWorkGroupOptions.set(true);
        this.workGroupFilterDropdownOpen.set(true);
    } 

    onWorkGroupFilterInput() {
        this.showAllWorkGroupOptions.set(false);
        this.workGroupFilterDropdownOpen.set(true);
    }

    toggleWorkGroupFilterDropdown() {
        this.showAllWorkGroupOptions.set(true);
        this.workGroupFilterDropdownOpen.update(open => !open);
    }

    @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent) {
        const target = event.target as Element | null;
        if (!target?.closest('.role-filter-combo')) {
        this.workGroupFilterDropdownOpen.set(false);
        this.showAllWorkGroupOptions.set(false);
        }
    }

    selectWorkGroupFilter(workGroup: WorkGroup) {
        const groupName = this.optionName(workGroup);
        this.filterNameWorkGroup.setValue(groupName, { emitEvent: false });
        this.filterNameValue.set(groupName.toLowerCase());

        this.currentFilters.update(filters => ({ ...filters, searchTerm: groupName }));
        (this.workGroupsService as any).currentFilters = { searchTerm: groupName }; // Salva il filtro di ricerca direttamente nel servizio per poterlo recuperare in caso di navigazione lontano dalla pagina e ritorno
        // this.caricaPagina(1); // Ricarica la prima pagina con il nuovo filtro

        this.workGroupFilterDropdownOpen.set(false);
        this.showAllWorkGroupOptions.set(false);
        this.closeSidePanel();
    }

    clearRoleFilter() {
        this.filterNameWorkGroup.setValue('', { emitEvent: false });
        this.filterNameValue.set('');

        this.currentFilters.update(filters => ({ ...filters, searchTerm: null }));
        (this.workGroupsService as any).currentFilters = { searchTerm: null }; // Rimuove il filtro di ricerca salvato nel servizio
        // this.caricaPagina(1); // Ricarica la prima pagina senza il filtro

        this.workGroupFilterDropdownOpen.set(false);
        this.showAllWorkGroupOptions.set(false);
        this.closeSidePanel();
    }

    aggiungiGruppo() {
        this.isAddingWorkGroupState.set(false);
        this.showNotification('success', NotifyAction.AddRole);
        // this.caricaPagina(1);
        forkJoin({
          groups: this.workGroupsService.loadAllWorkGroupsTest(),
          employees: this.employeesService.loadAllEmployees()
        }).subscribe({
          next: () => {
            console.log('Dati riallineati con il database con successo!');
          },
          error: (err) => {
            console.error('Errore durante il riallineamento dei dati dopo la creazione:', err);
          }
        });
    }

    chiudiPannello() {
        // this.selectedRoleId.set(null);
        // this.selectedRole.set(null);
        // this.filteredSelectedEmployees.set([]);
    }

    closeSidePanel() {
        this.selectedWorkGroupId.set(null);
        this.selectedWorkGroup.set(null);
        this.filteredSelectedEmployees.set([]);
    }

    apriModifica(w: WorkGroup) {
        this.editingWorkGroup.set(w); 
    }
    
    chiudiModifica() { this.editingWorkGroup.set(null); }
    apriAssegnaRisorse(w: WorkGroup) { this.assigningWorkGroup.set(w); }
    chiudiAssegnaRisorse() { this.assigningWorkGroup.set(null); }

    salvaModifica() {
        this.ricaricaGruppi();
        this.editingWorkGroup.set(null);
        this.showNotification('success', NotifyAction.UpdateWorkGroup);
    }

    salvaAssegnazioneRisorse() {
        this.assigningWorkGroup.set(null);
        this.showNotification('success', NotifyAction.Assegnazione, 'gruppi');

        this.employeesService.loadAllEmployees().subscribe({
            error: (err) => {
                console.error("Errore durante il riallineamento delle gruppi:", err);
                this.snackbarService.error(NotifyAction.Ricaricamento, 'gruppi', 'Chiudi');
            }
        });
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
        return `Errore durante il caricamento dei gruppi: ${getHttpErrorStatusMessage(error)}`;
    }
}
