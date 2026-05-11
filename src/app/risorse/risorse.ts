import { Component, DestroyRef, HostListener, computed, effect, inject, signal, OnInit } from '@angular/core';
import { RequestsService } from '../shared/requests.service';
import { Router } from '@angular/router';
import { Employee } from './risorse.model';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../shared/button/button';
import { ModificaRisorsaComponent } from './modifica/modifica';
import { NewRisorsaComponent } from './new-risorsa/new-risorsa';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RisorsaRowComponent } from './risorsa/risorsa';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, tap } from 'rxjs';

@Component({
  selector: 'app-risorse',
  templateUrl: './risorse.html',
  styleUrls: ['../shared/filter-styles.css', './risorse.css'],
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, ModificaRisorsaComponent, NewRisorsaComponent, RisorsaRowComponent, MatPaginatorModule],
  standalone: true 
})
export class RisorseComponent implements OnInit {
    isFetching = signal(false);
    error = signal('');
    private requestsService = inject(RequestsService);
    private destroyRef = inject(DestroyRef);
    private router = inject(Router);

    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);
    
    risorse = this.requestsService.employeesCaricati;
    allRisorse = this.requestsService.allEmployeesCaricati;

    listaJobRoles = signal<any[]>([]);
    listaJobRoleLevels = signal<any[]>([]);
    listaAziende = signal<any[]>([]);

    filtroNomeRisorsa = new FormControl('');
    filtroRuolo = new FormControl('');
    filtroLivello = new FormControl('');
    filtroAzienda = new FormControl('');

    filtroNomeValue = signal('');
    filtroRuoloValue = signal('');
    filtroLivelloValue = signal('');
    filtroAziendaValue = signal('');

    nameDropdownOpen = signal(false);
    roleDropdownOpen = signal(false);
    levelDropdownOpen = signal(false);
    companyDropdownOpen = signal(false);

    showAllNameOptions = signal(false);
    showAllRoleOptions = signal(false);
    showAllLevelOptions = signal(false);
    showAllCompanyOptions = signal(false);

    risorseFiltrate = computed<Employee[]>(() => {
        const hasFilters = !!(
            this.filtroNomeValue() ||
            this.filtroRuoloValue() ||
            this.filtroLivelloValue() ||
            this.filtroAziendaValue()
        );
        const source = hasFilters ? this.allRisorse() : this.risorse(); // Se ci sono applicati filtri, mi mostri i risultati filtrati
                                                                        // Basati su TUTTE le risorse, altrimenti mi mostri solo le risorse impaginate

        return source.filter(risorsa =>
            this.fullName(risorsa).toLowerCase().includes(this.filtroNomeValue()) &&
            risorsa.jobRole.toLowerCase().includes(this.filtroRuoloValue()) &&
            risorsa.jobRoleLevel.toLowerCase().includes(this.filtroLivelloValue()) &&
            risorsa.company.toLowerCase().includes(this.filtroAziendaValue())
        );
    });

    nameFilterOptions = computed<Employee[]>(() => {
        const term = this.showAllNameOptions() ? '' : this.filtroNomeValue();
        const employees = this.allRisorse();

        if (!term) {
            return employees;
        }

        return employees.filter(employee =>
            this.fullName(employee).toLowerCase().includes(term)
        );
    });

    roleFilterOptions = computed<any[]>(() => {
        const term = this.showAllRoleOptions() ? '' : this.filtroRuoloValue();
        const roles = this.listaJobRoles();

        if (!term) {
            return roles;
        }

        return roles.filter(role =>
            this.optionName(role).toLowerCase().includes(term)
        );
    });

    levelFilterOptions = computed<any[]>(() => {
        const term = this.showAllLevelOptions() ? '' : this.filtroLivelloValue();
        const levels = this.listaJobRoleLevels();

        if (!term) {
            return levels;
        }

        return levels.filter(level =>
            this.optionName(level).toLowerCase().includes(term)
        );
    });

    companyFilterOptions = computed<any[]>(() => {
        const term = this.showAllCompanyOptions() ? '' : this.filtroAziendaValue();
        const companies = this.listaAziende();

        if (!term) {
            return companies;
        }

        return companies.filter(company =>
            this.optionName(company).toLowerCase().includes(term)
        );
    });

    isRisorsaInAggiunta = signal<boolean | null>(null);
    risorsaInModifica = signal<Employee | null>(null); 
    risorsaInAggiunta = signal<Employee | null>(null);

    selectedRisorsaId = signal<string | null>(null);
    selectedRisorsa = signal<Employee | null>(null);

    currentPage = signal(1) //Pagina iniziale di default. Resa un signal per reagire ai cambiamenti
    pageSize = 10;
    pagination = this.requestsService.employeesPagination;

    constructor() {
        // Effetto per monitorare i cambiamenti della lista risorse
        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Nuova lista risorse:', this.risorse());
        });
    }

    onPageChange(event: PageEvent){
        const nextPage = event.pageIndex + 1;
        const nextPageSize = event.pageSize;

        this.pageSize = nextPageSize;
        this.caricaPagina(nextPage);
    }

    caricaPagina(page: number){
        this.isFetching.set(true);
        this.currentPage.set(page);
        this.chiudiPannello();

        this.requestsService.caricaEmployeesDisponibili(page, this.pageSize).pipe(
            finalize(() => this.isFetching.set(false))
        ).subscribe({
            next: () => {
                const meta = this.pagination();
                if(meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
                this.statusMessage.set({text: 'Risorse caricate con successo!', type: 'success'});
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento delle risorse: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il caricamento delle risorse', type: 'error'});
            },
        });
    }

    nextPage() {
        const meta = this.pagination();
        if(meta?.hasNext){
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
        
        // Caricamento principale delle risorse
        const subscription = this.requestsService.caricaEmployeesDisponibili(this.currentPage(), this.pageSize).pipe(
            finalize(() => this.isFetching.set(false))
        ).subscribe({
            next: (data) => {
                const meta = this.pagination();
                if (meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
                this.statusMessage.set({text: 'Risorse caricate con successo!', type: 'success'});
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento delle risorse: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il caricamento delle risorse', type: 'error'});
            },
        });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });

        const filterDataSubscription = forkJoin([
            this.requestsService.caricaTuttiEmployeesDisponibili(),
            this.requestsService.caricaTuttiJobRolesDisponibili(),
            this.requestsService.caricaJobRoleLevelsDisponibili(),
            this.requestsService.caricaAziendeDisponibili(),
        ]).subscribe({
            next: ([employees, roles, levels, companies]) => {
                this.listaJobRoles.set(roles);
                this.listaJobRoleLevels.set(levels);
                this.listaAziende.set(companies);
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento dei filtri risorse: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il caricamento dei filtri', type: 'error'});
            },
        });

        this.destroyRef.onDestroy(() => {
            filterDataSubscription.unsubscribe();
        });

        const nameFilterSubscription = this.filtroNomeRisorsa.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            tap(value => {
                this.filtroNomeValue.set((value || '').toLowerCase());
                this.showAllNameOptions.set(false);
            })
        ).subscribe();

        const roleFilterSubscription = this.filtroRuolo.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            tap(value => {
                this.filtroRuoloValue.set((value || '').toLowerCase());
                this.showAllRoleOptions.set(false);
            })
        ).subscribe();

        const levelFilterSubscription = this.filtroLivello.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            tap(value => {
                this.filtroLivelloValue.set((value || '').toLowerCase());
                this.showAllLevelOptions.set(false);
            })
        ).subscribe();

        const companyFilterSubscription = this.filtroAzienda.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            tap(value => {
                this.filtroAziendaValue.set((value || '').toLowerCase());
                this.showAllCompanyOptions.set(false);
            })
        ).subscribe();

        this.destroyRef.onDestroy(() => {
            nameFilterSubscription.unsubscribe();
            roleFilterSubscription.unsubscribe();
            levelFilterSubscription.unsubscribe();
            companyFilterSubscription.unsubscribe();
        });
    }

    ricaricaRisorse() {
        this.isFetching.set(true);
        const subscription = this.requestsService.caricaEmployeesDisponibili().pipe(
            finalize(() => this.isFetching.set(false))
        ).subscribe({
            next: (data) => {
                console.log('Risorse ricaricate:', data);
                const meta = this.pagination();
                if (meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
            },
            error: (err) => {
                this.error.set('Errore durante il ricaricamento delle risorse: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il ricaricamento delle risorse', type: 'error'});
            },
        });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });
    }

    aggiornaRisorse(){
        this.isFetching.set(true);
        const timeoutId = setTimeout(() => {
            const subscription = this.requestsService.caricaEmployeesDisponibili().pipe(
                finalize(() => this.isFetching.set(false))
            )
            .subscribe({
                next: (data) => {
                    this.statusMessage.set({text: 'Risorse aggiornate con successo!', type: 'success'});
                },
                error: (err) => {
                    this.error.set('Errore durante l\'aggiornamento delle risorse: ' + err.message);
                    this.statusMessage.set({text: 'Errore durante l\'aggiornamento delle risorse', type: 'error'});
                },
            });

            this.destroyRef.onDestroy(() => {
                subscription.unsubscribe();
            });

        }, 3000); // Simula un ritardo di 3 secondi

        this.destroyRef.onDestroy(() => {
            clearTimeout(timeoutId);
        });
    }

    onAggiuntaRisorsa() {
        this.isRisorsaInAggiunta.set(true);
    }

    annullaAggiuntaRisorsa() {
        this.isRisorsaInAggiunta.set(false);
    }

    aggiungiRisorsa(newRisorsa: Employee) {
        this.isRisorsaInAggiunta.set(false);
        this.statusMessage.set({text: 'Risorsa aggiunta con successo!', type: 'success'});
        this.currentPage.set(1); // torna alla pagina iniziale
        this.caricaPagina(1); // carica pagina iniziale
    }

    apriModifica(r: Employee) {
        this.risorsaInModifica.set(r);
    }

    chiudiModifica() {
        this.risorsaInModifica.set(null);
    }

    showNotification(text: string, type: 'success' | 'error') {
        this.statusMessage.set({ text, type });
        setTimeout(() => this.statusMessage.set(null), 3000);
    }

    salvaModifica() {
        this.ricaricaRisorse(); // Ricarica le risorse dopo la modifica
        this.risorsaInModifica.set(null);
        this.showNotification('Risorsa aggiornata con successo!', 'success');
    }

    apriDettagli(r: Employee){
        this.selectedRisorsa.set(r);
        this.router.navigate(['/risorse', r.id]);
    }

    chiudiPannello() {
        this.selectedRisorsaId.set(null);
        this.selectedRisorsa.set(null);
        // this.risorseFiltrateSelezionate.set([]);
    }

    fullName(employee: Employee): string {
        return `${employee.name || ''} ${employee.surname || ''}`.trim();
    }

    optionName(option: any): string {
        return option?.name || option?.Name || option || '';
    }

    onNameFilterFocus() {
        this.showAllNameOptions.set(true);
        this.nameDropdownOpen.set(true);
    }

    onNameFilterInput() {
        this.showAllNameOptions.set(false);
        this.nameDropdownOpen.set(true);
    }

    toggleNameFilterDropdown() {
        this.showAllNameOptions.set(true);
        this.nameDropdownOpen.update(open => !open);
    }

    selectNameFilter(employee: Employee) {
        const employeeName = this.fullName(employee);
        this.filtroNomeRisorsa.setValue(employeeName);
        this.filtroNomeValue.set(employeeName.toLowerCase());
        this.nameDropdownOpen.set(false);
        this.showAllNameOptions.set(false);
    }

    clearNameFilter() {
        this.filtroNomeRisorsa.setValue('');
        this.filtroNomeValue.set('');
        this.nameDropdownOpen.set(false);
        this.showAllNameOptions.set(false);
    }

    onRoleFilterFocus() {
        this.showAllRoleOptions.set(true);
        this.roleDropdownOpen.set(true);
    }

    onRoleFilterInput() {
        this.showAllRoleOptions.set(false);
        this.roleDropdownOpen.set(true);
    }

    toggleRoleFilterDropdown() {
        this.showAllRoleOptions.set(true);
        this.roleDropdownOpen.update(open => !open);
    }

    selectRoleFilter(role: any) {
        const roleName = this.optionName(role);
        this.filtroRuolo.setValue(roleName);
        this.filtroRuoloValue.set(roleName.toLowerCase());
        this.roleDropdownOpen.set(false);
        this.showAllRoleOptions.set(false);
    }

    clearRoleFilter() {
        this.filtroRuolo.setValue('');
        this.filtroRuoloValue.set('');
        this.roleDropdownOpen.set(false);
        this.showAllRoleOptions.set(false);
    }

    onLevelFilterFocus() {
        this.showAllLevelOptions.set(true);
        this.levelDropdownOpen.set(true);
    }

    onLevelFilterInput() {
        this.showAllLevelOptions.set(false);
        this.levelDropdownOpen.set(true);
    }

    toggleLevelFilterDropdown() {
        this.showAllLevelOptions.set(true);
        this.levelDropdownOpen.update(open => !open);
    }

    selectLevelFilter(level: any) {
        const levelName = this.optionName(level);
        this.filtroLivello.setValue(levelName);
        this.filtroLivelloValue.set(levelName.toLowerCase());
        this.levelDropdownOpen.set(false);
        this.showAllLevelOptions.set(false);
    }

    clearLevelFilter() {
        this.filtroLivello.setValue('');
        this.filtroLivelloValue.set('');
        this.levelDropdownOpen.set(false);
        this.showAllLevelOptions.set(false);
    }

    onCompanyFilterFocus() {
        this.showAllCompanyOptions.set(true);
        this.companyDropdownOpen.set(true);
    }

    onCompanyFilterInput() {
        this.showAllCompanyOptions.set(false);
        this.companyDropdownOpen.set(true);
    }

    toggleCompanyFilterDropdown() {
        this.showAllCompanyOptions.set(true);
        this.companyDropdownOpen.update(open => !open);
    }

    selectCompanyFilter(company: any) {
        const companyName = this.optionName(company);
        this.filtroAzienda.setValue(companyName);
        this.filtroAziendaValue.set(companyName.toLowerCase());
        this.companyDropdownOpen.set(false);
        this.showAllCompanyOptions.set(false);
    }

    clearCompanyFilter() {
        this.filtroAzienda.setValue('');
        this.filtroAziendaValue.set('');
        this.companyDropdownOpen.set(false);
        this.showAllCompanyOptions.set(false);
    }

    @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent) {
        const target = event.target as Element | null;

        if (!target?.closest('.resource-name-filter-combo')) {
            this.nameDropdownOpen.set(false);
            this.showAllNameOptions.set(false);
        }

        if (!target?.closest('.resource-role-filter-combo')) {
            this.roleDropdownOpen.set(false);
            this.showAllRoleOptions.set(false);
        }

        if (!target?.closest('.resource-level-filter-combo')) {
            this.levelDropdownOpen.set(false);
            this.showAllLevelOptions.set(false);
        }

        if (!target?.closest('.resource-company-filter-combo')) {
            this.companyDropdownOpen.set(false);
            this.showAllCompanyOptions.set(false);
        }
    }

}
