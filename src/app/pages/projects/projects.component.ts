import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { Project } from '../../shared/models/project.model';
import { Column } from '../../shared/table-row/table.types';
import { AppButtonComponent } from "../../shared/button/button";
import { PROGETTO_HEADERS } from './project/project.headers';
import { COMPLETE_PROJECT_HEADERS } from './project/complete-project.headers';
import { NewProgettoComponent } from "./new-project/new-project.component";
import { Router } from '@angular/router';
import { EditProjectComponent } from "./project/edit-project/edit-project.component";
import { effect } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, Subject, tap, switchMap, timer } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { ProjectsService } from '../../shared/services/projects.service';
import { LookupsService } from '../../shared/services/lookups.service';
import { CustomersService } from '../../shared/services/customers.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { NotifyAction } from '../../shared/enums/notify.enum';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { A11yModule } from "@angular/cdk/a11y";
import { FavouritesService } from '../../shared/services/favourites.service';
import { getHttpErrorStatusMessage } from '../../shared/utils/http-error-message.utils';
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';
import { toBackendDate } from '../../shared/utils/shared-utils';


@Component({
  selector: 'app-projects',
  imports: [
    AppButtonComponent,
    NewProgettoComponent,
    EditProjectComponent,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    A11yModule,
    MatIconModule,
    MatTooltipModule
],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss'],
  
})

export class ProjectsComponent {
  private projectsService = inject(ProjectsService);
  private lookupsService = inject(LookupsService);
  private customersService = inject(CustomersService);
  private destroyRef = inject(DestroyRef);
  private showMessage$ = new Subject<{text: string, type: 'success' | 'error'}>();
  private snackbarService = inject(SnackbarService);
  private favouritesService = inject(FavouritesService);
  private isFromDetailsPage = signal(false);
  isFetching = signal(false);
  error = signal<string | null>(null);
  statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);
  projects = this.projectsService.loadedProjects;
  isInitialLoading = signal(this.projectsService.loadedProjects().length === 0);

  private buildLoadProjectsErrorMessage(error: Error): string {
    return `Errore durante il caricamento dei progetti: ${getHttpErrorStatusMessage(error)}`;
  }

  isAddingProject = signal<boolean | null>(null);

  editingProject = signal<Project | null>(null);

  companiesList = signal<any[]>([]);
  statusesList = signal<any[]>([]);
  customersList = signal<any[]>([]);

  readonly projectHeaders: Partial<Record<keyof Project, string>> = COMPLETE_PROJECT_HEADERS;

  constructor(private router: Router) {
    const currentNav = this.router.currentNavigation();
    const previousUrl = currentNav?.previousNavigation?.finalUrl?.toString() || '';

    this.isFromDetailsPage.set(previousUrl.includes('/progetti/'));

    if (!this.isFromDetailsPage()) {
        (this.projectsService as any).currentFilters = {
            companyId: null,
            customerId: null,
            projectStatusId: null
        };
    }

    effect(() => {
      console.log('Lista progetti aggiornata dal backend:', this.projects());
    });

    this.showMessage$.pipe(
      tap(msg => this.statusMessage.set(msg)),
      switchMap(() => timer(3000)),
      takeUntilDestroyed()
    ).subscribe(() => {
        this.statusMessage.set(null);
    });
  }

  companyFilter = new FormControl('');
  customerFilter = new FormControl('');
  statusFilter = new FormControl('');
  yearFilter = new FormControl<string | null>(null);

  companyFilterValue = signal<string>('');
  customerFilterValue = signal<string>('');
  statusFilterValue = signal<string>('');
  yearFilterValue = signal<number | null>(null)

  companyDropdownOpen = signal(false);
  customerDropdownOpen = signal(false);
  statusDropdownOpen = signal(false);
  yearDropdownOpen = signal(false);
  showAllCompanyOptions = signal(false);
  showAllCustomerOptions = signal(false);
  showAllStatusOptions = signal(false);
  showAllYearOptions = signal(false);

  currentPage = signal(this.projectsService.paginationData()?.currentPage || 1);
  pageSize = this.projectsService.paginationData()?.pageSize || 10;
  pagination = this.projectsService.paginationData;
  currentFilters = signal({
    companyId: null as string | null,
    customerId: null as string | null,
    projectStatusId: null as string | null,
    year: null as number | null
  });

  AllProjects = this.projectsService.loadedProjects;

  filteredProjects = computed<Project[]>(() => this.projects());

  yearFilterOptions = computed<any[]>(() => {
    const projects = this.AllProjects();

    const allYears = projects.map(p => {
      return p.year ? p.year : null
    }).filter((year) : year is number => !!year) // Rimossi i valori null o undefined

    const uniqueYears = [...new Set(allYears)].sort((a, b) => b.toString().localeCompare(a.toString()));
    const term = this.showAllYearOptions() ? '' : this.yearFilterValue();

    if(!term) return uniqueYears;
    return uniqueYears.filter(year => year.toString().includes(term.toString()));
  })

  companyFilterOptions = computed<any[]>(() => {
    const term = this.showAllCompanyOptions()
      ? ''
      : this.companyFilterValue().toLowerCase();
    const companies = this.companiesList();

    if (!term) {
      return companies;
    }

    return companies.filter(company =>
      this.optionName(company).toLowerCase().includes(term)
    );
  });

  customerFilterOptions = computed<any[]>(() => {
    const term = this.showAllCustomerOptions()
      ? ''
      : this.customerFilterValue().toLowerCase();
    const customers = this.customersList();

    if (!term) {
      return customers;
    }

    return customers.filter(customer =>
      this.optionName(customer).toLowerCase().includes(term)
    );
  });

  statusFilterOptions = computed<any[]>(() => {
    const term = this.showAllStatusOptions()
      ? ''
      : this.statusFilterValue().toLowerCase();
    const statuses = this.statusesList();

    if (!term) {
      return statuses;
    }

    return statuses.filter(status =>
      this.optionName(status).toLowerCase().includes(term)
    );
  });

  filterData: any = {};

  loadInitialData(forceInitialSpinner = false) {
    const dataAlreadyLoaded = this.projectsService.loadedProjects().length > 0;
    this.error.set(null);

    const reloadFiltersAndInterface = (companies: any[], statuses: any[], customers: any[]) => {
        this.companiesList.set(companies);
        this.statusesList.set(statuses);
        this.customersList.set(customers);

        const savedFilters = (this.projectsService as any).currentFilters;
        if (savedFilters) {
            this.currentFilters.set(savedFilters);
            
            const companyName = companies.find((c: any) => c.id === savedFilters.companyId)?.name;
            if (companyName) {
                this.companyFilter.setValue(companyName, { emitEvent: false });
                this.companyFilterValue.set(companyName.toLowerCase());
            }

            const customerName = customers.find((cust: any) => cust.id === savedFilters.customerId)?.name;
            if (customerName) {
                this.customerFilter.setValue(customerName, { emitEvent: false });
                this.customerFilterValue.set(customerName.toLowerCase());
            }

            const statusName = statuses.find((s: any) => s.id === savedFilters.projectStatusId)?.name;
            if (statusName) {
                this.statusFilter.setValue(statusName, { emitEvent: false });
                this.statusFilterValue.set(statusName.toLowerCase());
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
          this.projectsService.loadProjects(this.currentPage(), this.pageSize, this.currentFilters()),
          this.lookupsService.loadAvailableCompanies(),
          this.lookupsService.loadProjectStatuses(),
          this.customersService.loadAvailableCustomers()
        ]).pipe(
          finalize(() => { this.isInitialLoading.set(false); this.isFetching.set(false); }),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: ([_, companies, statuses, customers]) => reloadFiltersAndInterface(companies, statuses, customers),
          error: (error) => this.manageLoadingErrors(error)
        });

    } 

    else {
        this.isFetching.set(true);
        this.isInitialLoading.set(true);

        forkJoin([
          this.projectsService.loadProjects(this.currentPage(), this.pageSize, this.currentFilters()),
          this.lookupsService.loadAvailableCompanies(),
          this.lookupsService.loadProjectStatuses(),
          this.customersService.loadAvailableCustomers(),
          timer(1500)
        ]).pipe(
          finalize(() => { this.isInitialLoading.set(false); this.isFetching.set(false); }),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: ([_, companies, statuses, customers]) => reloadFiltersAndInterface(companies, statuses, customers),
          error: (error) => this.manageLoadingErrors(error)
        });
    }

  }

  private manageLoadingErrors(error: Error) {
    this.error.set(this.buildLoadProjectsErrorMessage(error));
    this.snackbarService.error(NotifyAction.Caricamento, 'dati iniziali', 'Riprova')
    .onAction().subscribe(() => {
      this.loadInitialData(true);
    });
  }

  ngOnInit() {    
    this.error.set(null);
    const savedFilters = (this.projectsService as any).currentFilters;
    if (savedFilters) {
        this.currentFilters.set(savedFilters);
    } else {
        this.currentFilters.set({
            companyId: null,
            customerId: null,
            projectStatusId: null,
            year: null
        });
    }

    this.loadInitialData();

    // Imposto i listener per i filtri
    this.companyFilter.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => {
        const filterValue = value || '';
        this.companyFilterValue.set(filterValue.toLowerCase());
        this.showAllCompanyOptions.set(false);
        // this.projectsService.setCompanyFilter(filterValue);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.customerFilter.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => {
        const filterValue = value || '';
        this.customerFilterValue.set(filterValue.toLowerCase());
        this.showAllCustomerOptions.set(false);
        // this.projectsService.setCustomerFilter(filterValue);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.statusFilter.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => {
        this.statusFilterValue.set((value || '').toLowerCase());
        this.showAllStatusOptions.set(false);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.yearFilter.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => {
        const parsedYear = value ? parseInt(value, 10) : null; // Consenti solo numeri nel segnale di ricerca
        this.yearFilterValue.set(isNaN(parsedYear!) ? null : parsedYear);
        this.showAllYearOptions.set(false);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

  }

  columns: Column<Project>[] = [
    ...(Object.keys(this.projectHeaders) as (keyof Project)[])
      .filter(key => key !== 'id' && key in PROGETTO_HEADERS)
      .map(key => ({
        header: this.projectHeaders[key] ?? '',
        value: (p: Project) => {
          const rawValue = p[key];
          if (key === 'startDate' || key === 'endDate') {
            return toBackendDate(rawValue as string) ?? '';
          }
          return rawValue as any;
        }
      }))
      .filter(column => column.header !== ''),

    {
      header: 'Anno',
      align: 'center', 
      value: (p: Project) => p.year ?? '-'
    }
  ]; //Da adattare alle altre Tabelle!

  get projectColumnsCount(): number{
    return this.columns.length;
  }

  openCreateProject(){
    this.isAddingProject.set(true);
  }

  onProjectCreated() {
    this.isAddingProject.set(false);
    this.projectsService.loadProjects(this.currentPage(), this.pageSize, this.currentFilters()).subscribe({
      next: () => {
        this.showNotification('success', NotifyAction.Salvataggio, 'progetto');
      }
    });
  }

  closeCreateProject(){
    this.isAddingProject.set(false);
  }

  refreshProjects() {
    this.isFetching.set(true);
    this.error.set(null);

    timer(1500).pipe(
      switchMap(() => this.projectsService.loadProjects(this.currentPage(), this.pageSize, this.currentFilters())),
      finalize(() => this.isFetching.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      error: (error: Error) => {
        this.error.set(this.buildLoadProjectsErrorMessage(error));
        this.showNotification('error', NotifyAction.Caricamento, 'progetti');
      },
    });
  }

  onToggleFavorite(project: Project) {
    this.favouritesService.toggleFavorite(project.id, project.isFavorite);
    project.isFavorite = !project.isFavorite;
  }

  openEditProject(project: Project) {
    this.editingProject.set(project);
  }

  closeEditProject() {
    this.editingProject.set(null);
  }

  onProjectSaved() {
    this.editingProject.set(null);
    // Qui potresti chiamare un metodo del service per salvare le modifiche sul backend, ad esempio:
    this.projectsService.loadProjects(this.currentPage(), this.pageSize, this.currentFilters()).subscribe({
      next: () => {
        this.showNotification('success', NotifyAction.Salvataggio, 'progetto');
      }
    });
  }

  loadPage(page: number, forceInitialSpinner = false) {
    this.currentPage.set(page);
    this.isFetching.set(true);
    this.isInitialLoading.set(forceInitialSpinner);
    this.error.set(null);

    (this.projectsService as any).currentFilters = this.currentFilters();

    this.projectsService.loadProjects(page, this.pageSize, this.currentFilters()).pipe(
      finalize(() => {
        this.isFetching.set(false);
        this.isInitialLoading.set(false);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      error: (error: Error) => {
        this.error.set(this.buildLoadProjectsErrorMessage(error));
        this.snackbarService.error(NotifyAction.Caricamento, 'progetti', 'Riprova')
        .onAction().subscribe(() => {
          this.loadPage(page, true);
        });
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.loadPage(event.pageIndex + 1);
  }

  showNotification(type: 'success' | 'error', action: NotifyAction, params?: string | string[]) {
  if (type === 'success') {
    this.snackbarService.success(action, params);
  } else {
    this.snackbarService.error(action, params ?? []);
  }
}

  optionName(option: any): string {
    return option?.name || option?.Name || option || '';
  }

  toggleFavorite(project: Project): void {
    project.isFavorite = !project.isFavorite;
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
    const companyId = company?.id || company?.Id || null;
    this.companyFilter.setValue(companyName, { emitEvent: false });
    this.companyFilterValue.set(companyName.toLowerCase());

    this.currentFilters.update(filters => ({ ...filters, companyId }));
    this.loadPage(1); // Ricarica la prima pagina con il nuovo filtro

    this.companyDropdownOpen.set(false);
    this.showAllCompanyOptions.set(false);
  }

  clearCompanyFilter() {
    this.companyFilter.setValue('', { emitEvent: false });
    this.companyFilterValue.set('');

    this.currentFilters.update(filters => ({ ...filters, companyId: null }));
    this.loadPage(1); // Ricarica la prima pagina senza il filtro

    this.companyDropdownOpen.set(false);
    this.showAllCompanyOptions.set(false);
  }

  onCustomerFilterFocus() {
    this.showAllCustomerOptions.set(true);
    this.customerDropdownOpen.set(true);
  }

  onCustomerFilterInput() {
    this.showAllCustomerOptions.set(false);
    this.customerDropdownOpen.set(true);
  }

  toggleCustomerFilterDropdown() {
    this.showAllCustomerOptions.set(true);
    this.customerDropdownOpen.update(open => !open);
  }

  selectCustomerFilter(customer: any) {
    const customerName = this.optionName(customer);
    const customerId = customer?.id || customer?.Id || null;


    this.customerFilter.setValue(customerName, { emitEvent: false });
    this.customerFilterValue.set(customerName.toLowerCase());

    this.currentFilters.update(filters => ({ ...filters, customerId }));
    this.loadPage(1); // Ricarica la prima pagina con il nuovo filtro

    this.customerDropdownOpen.set(false);
    this.showAllCustomerOptions.set(false);
  }

  clearCustomerFilter() {
    this.customerFilter.setValue('', { emitEvent: false });
    this.customerFilterValue.set('');
    this.currentFilters.update(filters => ({ ...filters, customerId: null }));
    this.loadPage(1); // Ricarica la prima pagina senza il filtro
    this.customerDropdownOpen.set(false);
    this.showAllCustomerOptions.set(false);
  }

  onStatusFilterFocus() {
    this.showAllStatusOptions.set(true);
    this.statusDropdownOpen.set(true);
  }

  onStatusFilterInput() {
    this.showAllStatusOptions.set(false);
    this.statusDropdownOpen.set(true);
  }

  toggleStatusFilterDropdown() {
    this.showAllStatusOptions.set(true);
    this.statusDropdownOpen.update(open => !open);
  }

  selectStatusFilter(status: any) {
    const statusName = this.optionName(status);
    const statusId = status?.id || status?.Id || '';
    this.statusFilter.setValue(statusName, { emitEvent: false });
    this.statusFilterValue.set(statusName.toLowerCase());

    this.currentFilters.update(filters => ({ ...filters, projectStatusId: statusId }));
    this.loadPage(1); // Ricarica la prima pagina con il nuovo filtro
    
    this.statusDropdownOpen.set(false);
    this.showAllStatusOptions.set(false);
  }

  clearStatusFilter() {
    this.statusFilter.setValue('', { emitEvent: false });
    this.statusFilterValue.set('');

    this.currentFilters.update(filters => ({ ...filters, projectStatusId: null }));
    this.loadPage(1); // Ricarica la prima pagina senza il filtro

    this.statusDropdownOpen.set(false);
    this.showAllStatusOptions.set(false);
  }

  onYearFilterFocus() {
  this.showAllYearOptions.set(true);
  this.yearDropdownOpen.set(true);
}

onYearFilterInput(event: Event) {
  const input = event.target as HTMLInputElement;
  // Forza la pulizia da caratteri non numerici in tempo reale mentre scrive
  input.value = input.value.replace(/[^0-9]/g, '');
  this.yearFilter.setValue(input.value, { emitEvent: true });
  
  this.showAllYearOptions.set(false);
  this.yearDropdownOpen.set(true);
}

toggleYearFilterDropdown() {
  this.showAllYearOptions.set(true);
  this.yearDropdownOpen.update(open => !open);
}

selectYearFilter(year: number) {
  this.yearFilter.setValue(year.toString(), { emitEvent: false });
  this.yearFilterValue.set(year);

  this.currentFilters.update(filters => ({ ...filters, year: year }));
  this.loadPage(1); // Ricarica la tabella filtrata

  this.yearDropdownOpen.set(false);
  this.showAllYearOptions.set(false);
}

clearYearFilter() {
  this.yearFilter.setValue(null, { emitEvent: false });
  this.yearFilterValue.set(null);

  this.currentFilters.update(filters => ({ ...filters, year: null }));
  this.loadPage(1);

  this.yearDropdownOpen.set(false);
  this.showAllYearOptions.set(false);
}

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent) {
    const target = event.target as Element | null;

    if (!target?.closest('.company-filter-combo')) {
      this.companyDropdownOpen.set(false);
      this.showAllCompanyOptions.set(false);
    }

    if (!target?.closest('.customer-filter-combo')) {
      this.customerDropdownOpen.set(false);
      this.showAllCustomerOptions.set(false);
    }

    if (!target?.closest('.status-filter-combo')) {
      this.statusDropdownOpen.set(false);
      this.showAllStatusOptions.set(false);
    }
    if (!target?.closest('.year-filter-combo')) {
      this.yearDropdownOpen.set(false);
      this.showAllYearOptions.set(false);
    }
  }

  openProjectDetails(id: string){
    this.router.navigate(['/progetti', id]);
  }

}
