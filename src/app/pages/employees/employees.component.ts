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
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { NotifyAction } from '../../shared/enums/notify.enum';
import { getHttpErrorStatusMessage } from '../../shared/utils/http-error-message.utils';
import { EMPLOYEES_HEADERS_TABLE } from './employee.headers';
import { Column } from '../../shared/table-row/table.types';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteDialogComponent } from '../../shared/components/confirm-delete-dialog/confirm-delete-dialog';

type HeaderKey = keyof typeof EMPLOYEES_HEADERS_TABLE;

@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, EditEmployeeComponent, NewRisorsaComponent, EmployeeRowComponent, MatPaginatorModule, MatProgressSpinnerModule],
  standalone: true 
})
export class EmployeesComponent implements OnInit {
    isFetching = signal(false);
    error = signal<string | null>(null);

    private rolesService = inject(RolesService);
    private employeesService = inject(EmployeesService);
    private lookupsService = inject(LookupsService)
    private destroyRef = inject(DestroyRef);
    private snackbarService = inject(SnackbarService);
    private isFromDetailsPage = signal(false);
    private dialog = inject(MatDialog);
    private showMessage$ = new Subject<{text: string, type: 'success' | 'error'}>();

    isInitialLoading = signal(this.employeesService.loadedEmployees().length === 0);
    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);
    
    deletingEmployeeId = signal<string | null>(null);

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

    filteredEmployees = computed<Employee[]>(() => this.employees());

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

    currentPage = signal(this.employeesService.paginationData()?.currentPage || 1); 
    pageSize = this.employeesService.paginationData()?.pageSize || 10;
    pagination = this.employeesService.paginationData;
    currentFilters = signal({
        searchTerm: null as string | null,
        jobRoleId: null as string | null,
        jobRoleLevelId: null as string | null,
        companyId: null as string | null
     });

    employeeHeaders: Record<keyof typeof EMPLOYEES_HEADERS_TABLE, string> = EMPLOYEES_HEADERS_TABLE;
    
    columns: Column<Employee>[] = (['employee', 'jobRole', 'jobRoleLevel', 'company'] as HeaderKey[])
    .map(key => ({
        header: this.employeeHeaders[key] ?? '',
        value: (e: Employee) => {
        if (key === 'employee') {
            return `${e.name} ${e.surname}`; 
        }
        return (e as any)[key] ?? '';
        }
    }));

    get projectColumnsCount(): number {
        return this.columns.length;
    }     

    constructor(private router: Router) {

        const currentNav = this.router.currentNavigation();
        const previousUrl = currentNav?.previousNavigation?.finalUrl?.toString() || '';

        this.isFromDetailsPage.set(previousUrl.includes('/risorse/'));

        if(!this.isFromDetailsPage()){
            (this.employeesService as any).currentFilters = {
                searchTerm: null,
                jobRoleId: null,
                jobRoleLevelId: null,
                companyId: null
            }
        }

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

    loadPage(page: number, forceInitialSpinner = false){
        this.isFetching.set(true);
        this.isInitialLoading.set(forceInitialSpinner);
        this.currentPage.set(page);
        this.closePanel();
        this.error.set(null);

        (this.employeesService as any).currentFilters = this.currentFilters();

        this.employeesService.loadEmployees(page, this.pageSize, this.currentFilters()).pipe(
            finalize(() => {
                this.isFetching.set(false);
                this.isInitialLoading.set(false);
            })
        ).subscribe({
            next: () => {
                const meta = this.pagination();
                if(meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
            },
            error: (err) => {
                if(this.error() === null){
                    this.error.set(this.buildLoadEmployeesErrorMessage(err));
                    this.snackbarService.error(NotifyAction.Caricamento, `risorse`, 'Riprova')
                    .onAction()
                    .subscribe(() => {
                        this.loadPage(page, true);
                    });
                }
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

    private manageLoadingErrors(err: any) {
        this.error.set(this.buildLoadEmployeesErrorMessage(err));               
        this.snackbarService.error(NotifyAction.Caricamento, 'dati iniziali', 'Riprova')
        .onAction()
        .subscribe(() => {
            this.loadInitialData(true);
        });
    }

    loadInitialData(forceInitialSpinner = false) {
        const dataAlreadyLoaded = this.employeesService.loadedEmployees().length > 0;
        this.error.set(null);

        const reloadFiltersAndInterface = (roles: any[], levels: any[], companies: any[]) => {
            this.jobRolesList.set(roles);
            this.jobRoleLevelsList.set(levels);
            this.companiesList.set(companies);

            const savedFilters = (this.employeesService as any).currentFilters;
            if (savedFilters) {
                this.currentFilters.set(savedFilters);
                
                if (savedFilters.searchTerm) {
                    this.filterEmployeeName.setValue(savedFilters.searchTerm, { emitEvent: false });
                    this.filterNameValue.set(savedFilters.searchTerm.toLowerCase());
                }
                
                const roleName = roles.find((r: any) => r.id === savedFilters.jobRoleId)?.name;
                if (roleName) {
                    this.filterRole.setValue(roleName, { emitEvent: false });
                    this.filterRoleValue.set(roleName.toLowerCase());
                }

                const levelName = levels.find((l: any) => l.id === savedFilters.jobRoleLevelId)?.name;
                if (levelName) {
                    this.filterLevel.setValue(levelName, { emitEvent: false });
                    this.filterLevelValue.set(levelName.toLowerCase());
                }

                const companyName = companies.find((c: any) => c.id === savedFilters.companyId)?.name;
                if (companyName) {
                    this.filterCompany.setValue(companyName, { emitEvent: false });
                    this.filterCompanyValue.set(companyName.toLowerCase());
                }
            }

            const meta = this.pagination();
            if (meta) {
                this.currentPage.set(meta.currentPage);
                this.pageSize = meta.pageSize;
            }
        };

        if (dataAlreadyLoaded && !forceInitialSpinner) {
            this.isFetching.set(true);
            this.isInitialLoading.set(false);

            forkJoin([
                this.employeesService.loadEmployees(this.currentPage(), this.pageSize, this.currentFilters()),
                this.employeesService.loadAllEmployees(),
                this.rolesService.loadAllJobRoles(),
                this.rolesService.loadJobRoleLevels(),
                this.lookupsService.loadAvailableCompanies()
            ]).pipe(
                finalize(() => { this.isInitialLoading.set(false); this.isFetching.set(false); }),
                takeUntilDestroyed(this.destroyRef)
            ).subscribe({
                next: ([_, _allEmps, roles, levels, companies]) => reloadFiltersAndInterface(roles, levels, companies),
                error: (err) => this.manageLoadingErrors(err)
            });

        } 

        else {
            this.isFetching.set(true);
            this.isInitialLoading.set(true); // Mostra lo spinner 

            forkJoin([
                this.employeesService.loadEmployees(this.currentPage(), this.pageSize, this.currentFilters()),
                this.employeesService.loadAllEmployees(),
                this.rolesService.loadAllJobRoles(),
                this.rolesService.loadJobRoleLevels(),
                this.lookupsService.loadAvailableCompanies(),
                timer(1500)
            ]).pipe(
                finalize(() => { this.isInitialLoading.set(false); this.isFetching.set(false); }),
                takeUntilDestroyed(this.destroyRef)
            ).subscribe({
                next: ([_, _allEmps, roles, levels, companies]) => reloadFiltersAndInterface(roles, levels, companies),
                error: (err) => this.manageLoadingErrors(err)
            });
        }
    }

    ngOnInit() {
        this.error.set(null);

        const savedFilters = (this.employeesService as any).currentFilters;
        if (savedFilters) {
            this.currentFilters.set(savedFilters);
        } else {
            this.currentFilters.set({
                searchTerm: null,
                jobRoleId: null,
                jobRoleLevelId: null,
                companyId: null
            });
        }

        this.loadInitialData();

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
        this.error.set(null);
        this.employeesService.loadEmployees().pipe(
            finalize(() => this.isFetching.set(false)),
            takeUntilDestroyed(this.destroyRef)
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
                if(this.error() === null){
                    this.error.set(`Errore durante il ricaricamento delle risorse: ${getHttpErrorStatusMessage(err)}`);
                    this.showNotification('error', NotifyAction.Ricaricamento, 'risorse');
                }
            },
        });
    }

    updateEmployees(){
        this.isFetching.set(true);
        this.error.set(null);
        timer(3000).pipe(
            switchMap(() => this.employeesService.loadEmployees(this.currentPage(), this.pageSize, this.currentFilters())),
            finalize(() => this.isFetching.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: (data) => {
                console.log('Risorse aggiornate:', data);
                const meta = this.pagination();
                if (meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
                this.showNotification('success', NotifyAction.Aggiornamento, 'risorse');
            },
            error: (err) => {
                if(this.error() === null){
                    this.error.set(`Errore durante l'aggiornamento delle risorse: ${getHttpErrorStatusMessage(err)}`);
                    this.showNotification('error', NotifyAction.Aggiornamento, 'risorse');
                }
            },
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
        this.showNotification('success', NotifyAction.AddEmployee, 'risorse');
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
    showNotification(type: 'success' | 'error', action: NotifyAction, params?: string | string[]) {
    if (type === 'success') {
        this.snackbarService.success(action, params);
    } else {
        this.snackbarService.error(action, params ?? []);
    }
    }

    private buildLoadEmployeesErrorMessage(error: Error): string {
        return `Errore durante il caricamento delle risorse: ${getHttpErrorStatusMessage(error)}`;
    }

    safeEdits() {
        this.reloadEmployees(); 
        this.editingEmployee.set(null);
        this.showNotification('success', NotifyAction.Salvataggio, 'risorse');
    }

    onDeleteEmployee(employee: Employee): void {
        const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
            data: {
                name: `${employee.name} ${employee.surname}`,
                entityLabel: 'la risorsa'
            },
            disableClose: true // Impedisce di chiuderlo cliccando fuori per errore
        });

        // Risultato alla chiusura del form
        dialogRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) {
            this.deletingEmployeeId.set(employee.id)
            this.onEmployeeDeleted();
            }
        });
    }

    onEmployeeDeleted(): void {
    const idToDelete = this.deletingEmployeeId();
        if(idToDelete === null) return;

        this.isFetching.set(true);
        this.employeesService.toggleEliminatedState(idToDelete, true).pipe(
            finalize(() => 
            {
                this.isFetching.set(false);
                this.deletingEmployeeId.set(null);
            }
            ),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
            this.snackbarService.success(NotifyAction.Eliminazione, 'risorse');
            this.loadPage(this.currentPage());
            },
            error: () => {
            this.snackbarService.error(NotifyAction.Eliminazione, 'risorse', 'Chiudi');
            }
        })
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
        this.filterEmployeeName.setValue(employeeName, { emitEvent: false });
        this.filterNameValue.set(employeeName.toLowerCase());

        this.currentFilters.update(filters => ({ ...filters, searchTerm: employeeName }));
        this.loadPage(1);

        this.nameDropdownOpen.set(false);
        this.showAllNameOptions.set(false);
    }

    clearNameFilter() {
        this.filterEmployeeName.setValue('', { emitEvent: false });
        this.filterNameValue.set('');

        this.currentFilters.update(filters => ({ ...filters, searchTerm: null }));
        this.loadPage(1);

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
        this.filterRole.setValue(roleName, { emitEvent: false });
        this.filterRoleValue.set(roleName.toLowerCase());

        this.currentFilters.update(filters => ({ ...filters, jobRoleId: role.id }));
        this.loadPage(1);

        this.roleDropdownOpen.set(false);
        this.showAllRoleOptions.set(false);
    }

    clearRoleFilter() {
        this.filterRole.setValue('', { emitEvent: false });
        this.filterRoleValue.set('');

        this.currentFilters.update(filters => ({ ...filters, jobRoleId: null }));
        this.loadPage(1);

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
        this.filterLevel.setValue(levelName, { emitEvent: false });
        this.filterLevelValue.set(levelName.toLowerCase());

        this.currentFilters.update(filters => ({ ...filters, jobRoleLevelId: level.id }));
        this.loadPage(1);

        this.levelDropdownOpen.set(false);
        this.showAllLevelOptions.set(false);
    }

    clearLevelFilter() {
        this.filterLevel.setValue('', { emitEvent: false });
        this.filterLevelValue.set('');

        this.currentFilters.update(filters => ({ ...filters, jobRoleLevelId: null }));
        this.loadPage(1);

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
        this.filterCompany.setValue(companyName, { emitEvent: false });
        this.filterCompanyValue.set(companyName.toLowerCase());

        this.currentFilters.update(filters => ({ ...filters, companyId: company.id }));
        this.loadPage(1);

        this.companyDropdownOpen.set(false);
        this.showAllCompanyOptions.set(false);
    }

    clearCompanyFilter() {
        this.filterCompany.setValue('');
        this.filterCompanyValue.set('');

        this.currentFilters.update(filters => ({ ...filters, companyId: null }));
        this.loadPage(1);

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
