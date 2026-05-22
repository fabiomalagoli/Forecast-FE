import { Component, DestroyRef, HostListener, computed, effect, inject, signal, OnInit } from '@angular/core';
import { EmployeesService } from '../../shared/services/employees.service';
import { RolesService } from '../../shared/services/roles.service';
import { LookupsService } from '../../shared/services/lookups.service'; 
import { Router } from '@angular/router';
import { Employee } from '../../shared/models/employee.model';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../shared/button/button';
import { EditEmployeeComponent } from './edit-employee/edit-employee.component';
import { NewRisorsaComponent } from './new-employee/new-employee.component';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { EmployeeRowComponent } from './employee/employee.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, tap, switchMap, Subject, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['../../shared/filter-styles.scss', './employees.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, EditEmployeeComponent, NewRisorsaComponent, EmployeeRowComponent, MatPaginatorModule],
  standalone: true 
})
export class EmployeesComponent implements OnInit {
    isFetching = signal(false);
    error = signal('');

    private rolesService = inject(RolesService);
    private employeesService = inject(EmployeesService);
    private lookupsService = inject(LookupsService)
    private destroyRef = inject(DestroyRef);
    private router = inject(Router);

    private showMessage$ = new Subject<{text: string, type: 'success' | 'error'}>();

    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);
    
    employees = this.employeesService.loadedEmployees;
    allEmployees = this.employeesService.loadedAllEmployees;

    jobRolesList = signal<any[]>([]);
    jobRoleLevelsList = signal<any[]>([]);
    companiesList = signal<any[]>([]);

    filterEmployeeName = new FormControl('');
    filterRole = new FormControl('');
    filterLevel = new FormControl('');
    filterCompany = new FormControl('');

    filterNameValue = signal('');
    filterRoleValue = signal('');
    filterLevelValue = signal('');
    filterCompanyValue = signal('');

    nameDropdownOpen = signal(false);
    roleDropdownOpen = signal(false);
    levelDropdownOpen = signal(false);
    companyDropdownOpen = signal(false);

    showAllNameOptions = signal(false);
    showAllRoleOptions = signal(false);
    showAllLevelOptions = signal(false);
    showAllCompanyOptions = signal(false);

    filteredEmployees = computed<Employee[]>(() => {
        const hasFilters = !!(
            this.filterNameValue() ||
            this.filterRoleValue() ||
            this.filterLevelValue() ||
            this.filterCompanyValue()
        );
        const source = hasFilters ? this.allEmployees() : this.employees(); 

        return source.filter(risorsa =>
            this.fullName(risorsa).toLowerCase().includes(this.filterNameValue()) &&
            risorsa.jobRole.toLowerCase().includes(this.filterRoleValue()) &&
            risorsa.jobRoleLevel.toLowerCase().includes(this.filterLevelValue()) &&
            risorsa.company.toLowerCase().includes(this.filterCompanyValue())
        );
    });

    nameFilterOptions = computed<Employee[]>(() => {
        const term = this.showAllNameOptions() ? '' : this.filterNameValue();
        const employees = this.allEmployees();

        if (!term) {
            return employees;
        }

        return employees.filter(employee =>
            this.fullName(employee).toLowerCase().includes(term)
        );
    });

    roleFilterOptions = computed<any[]>(() => {
        const term = this.showAllRoleOptions() ? '' : this.filterRoleValue();
        const roles = this.jobRolesList();

        if (!term) {
            return roles;
        }

        return roles.filter(role =>
            this.optionName(role).toLowerCase().includes(term)
        );
    });

    levelFilterOptions = computed<any[]>(() => {
        const term = this.showAllLevelOptions() ? '' : this.filterLevelValue();
        const levels = this.jobRoleLevelsList();

        if (!term) {
            return levels;
        }

        return levels.filter(level =>
            this.optionName(level).toLowerCase().includes(term)
        );
    });

    companyFilterOptions = computed<any[]>(() => {
        const term = this.showAllCompanyOptions() ? '' : this.filterCompanyValue();
        const companies = this.companiesList();

        if (!term) {
            return companies;
        }

        return companies.filter(company =>
            this.optionName(company).toLowerCase().includes(term)
        );
    });

    isAddingEmployeeState = signal<boolean | null>(null);
    editingEmployee = signal<Employee | null>(null); 
    addingEmployee = signal<Employee | null>(null);

    selectedEmployeeId = signal<string | null>(null);
    selectedEmployee = signal<Employee | null>(null);

    currentPage = signal(1) 
    pageSize = 10;
    pagination = this.employeesService.paginationData;

    constructor() {
        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Nuova lista risorse:', this.employees());
        });

        this.showMessage$.pipe(
            tap(msg => this.statusMessage.set(msg)),
            switchMap(() => timer(3000)),
            takeUntilDestroyed()
        ).subscribe(() => {
            this.statusMessage.set(null);
        });
    }

    onPageChange(event: PageEvent){
        const nextPage = event.pageIndex + 1;
        const nextPageSize = event.pageSize;

        this.pageSize = nextPageSize;
        this.loadPage(nextPage);
    }

    loadPage(page: number){
        this.isFetching.set(true);
        this.currentPage.set(page);
        this.closePanel();

        this.employeesService.loadEmployees(page, this.pageSize).pipe(
            finalize(() => this.isFetching.set(false))
        ).subscribe({
            next: () => {
                const meta = this.pagination();
                if(meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento delle risorse: ' + err.message);
                this.showMessage$.next({text: 'Errore durante il caricamento delle risorse', type: 'error'});
            },
        });
    }

    nextPage() {
        const meta = this.pagination();
        if(meta?.hasNext){
            this.loadPage(meta.currentPage + 1);
        }
    }

    prevPage() {
        const meta = this.pagination();
        if (meta?.hasPrevious) {
            this.loadPage(meta.currentPage - 1);
        }
    }

    ngOnInit() {
        this.isFetching.set(true);
        
        const subscription = this.employeesService.loadEmployees(this.currentPage(), this.pageSize).pipe(
            finalize(() => this.isFetching.set(false))
        ).subscribe({
            next: (data) => {
                const meta = this.pagination();
                if (meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento delle risorse: ' + err.message);
                this.showMessage$.next({text: 'Errore durante il caricamento delle risorse', type: 'error'});
            },
        });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });

        const filterDataSubscription = forkJoin([
            this.employeesService.loadAllEmployees(),
            this.rolesService.loadAllJobRoles(),
            this.rolesService.loadJobRoleLevels(),
            this.lookupsService.loadAvailableCompanies(),
        ]).subscribe({
            next: ([employees, roles, levels, companies]) => {
                this.jobRolesList.set(roles);
                this.jobRoleLevelsList.set(levels);
                this.companiesList.set(companies);
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento dei filtri risorse: ' + err.message);
                this.showMessage$.next({text: 'Errore durante il caricamento dei filtri', type: 'error'});
            },
        });

        this.destroyRef.onDestroy(() => {
            filterDataSubscription.unsubscribe();
        });

        const nameFilterSubscription = this.filterEmployeeName.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            tap(value => {
                this.filterNameValue.set((value || '').toLowerCase());
                this.showAllNameOptions.set(false);
            })
        ).subscribe();

        const roleFilterSubscription = this.filterRole.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            tap(value => {
                this.filterRoleValue.set((value || '').toLowerCase());
                this.showAllRoleOptions.set(false);
            })
        ).subscribe();

        const levelFilterSubscription = this.filterLevel.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            tap(value => {
                this.filterLevelValue.set((value || '').toLowerCase());
                this.showAllLevelOptions.set(false);
            })
        ).subscribe();

        const companyFilterSubscription = this.filterCompany.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            tap(value => {
                this.filterCompanyValue.set((value || '').toLowerCase());
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

    reloadEmployees() {
        this.isFetching.set(true);
        const subscription = this.employeesService.loadEmployees().pipe(
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
                this.showMessage$.next({text: 'Errore durante il ricaricamento delle risorse', type: 'error'});
            },
        });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });
    }

    updateEmployees(){
        this.isFetching.set(true);
        const timeoutId = setTimeout(() => {
            const subscription = this.employeesService.loadEmployees().pipe(
                finalize(() => this.isFetching.set(false))
            )
            .subscribe({
                next: () => {
                    this.showNotification('Risorse aggiornate con successo!', 'success');
                },
                error: (err) => {
                    this.error.set('Errore durante l\'aggiornamento delle risorse: ' + err.message);
                    this.showNotification('Errore durante l\'aggiornamento delle risorse', 'error');
                },
            });

            this.destroyRef.onDestroy(() => {
                subscription.unsubscribe();
            });

        }, 3000); 

        this.destroyRef.onDestroy(() => {
            clearTimeout(timeoutId);
        });
    }

    onAddingEmployee() {
        this.isAddingEmployeeState.set(true);
    }

    cancelEmployeeAddition() {
        this.isAddingEmployeeState.set(false);
    }

    addEmployee() {
        this.isAddingEmployeeState.set(false);
        this.showMessage$.next({text: 'Risorsa aggiunta con successo!', type: 'success'});
        this.currentPage.set(1); 
        this.loadPage(1); 
    }

    openEmployeeEdit(r: Employee) {
        this.editingEmployee.set(r);
    }

    closeEmployeeEdit() {
        this.editingEmployee.set(null);
    }

    // Funzione ponte perfetta per il Subject
    showNotification(text: string, type: 'success' | 'error') {
        this.showMessage$.next({ text, type });
    }

    safeEdits() {
        this.reloadEmployees(); 
        this.editingEmployee.set(null);
        this.showNotification('Risorsa aggiornata con successo!', 'success');
    }

    openEmployeeDetails(r: Employee){
        this.selectedEmployee.set(r);
        this.router.navigate(['/risorse', r.id]);
    }

    closePanel() {
        this.selectedEmployeeId.set(null);
        this.selectedEmployee.set(null);
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
        this.filterEmployeeName.setValue(employeeName);
        this.filterNameValue.set(employeeName.toLowerCase());
        this.nameDropdownOpen.set(false);
        this.showAllNameOptions.set(false);
    }

    clearNameFilter() {
        this.filterEmployeeName.setValue('');
        this.filterNameValue.set('');
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
        this.filterRole.setValue(roleName);
        this.filterRoleValue.set(roleName.toLowerCase());
        this.roleDropdownOpen.set(false);
        this.showAllRoleOptions.set(false);
    }

    clearRoleFilter() {
        this.filterRole.setValue('');
        this.filterRoleValue.set('');
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
        this.filterLevel.setValue(levelName);
        this.filterLevelValue.set(levelName.toLowerCase());
        this.levelDropdownOpen.set(false);
        this.showAllLevelOptions.set(false);
    }

    clearLevelFilter() {
        this.filterLevel.setValue('');
        this.filterLevelValue.set('');
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
        this.filterCompany.setValue(companyName);
        this.filterCompanyValue.set(companyName.toLowerCase());
        this.companyDropdownOpen.set(false);
        this.showAllCompanyOptions.set(false);
    }

    clearCompanyFilter() {
        this.filterCompany.setValue('');
        this.filterCompanyValue.set('');
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
