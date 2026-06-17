import { Component, inject, signal, OnInit, computed, HostListener, input, DestroyRef, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { COMPLETE_PROJECT_HEADERS } from '../../../projects/project/complete-project.headers';
import { AppButtonComponent } from '../../../../shared/button/button';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, tap, timer } from 'rxjs';
import { CustomersService } from '../../../../shared/services/customers.service';
import { EmployeesService } from '../../../../shared/services/employees.service';
import { RolesService } from '../../../../shared/services/roles.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CustomerProjectSummaryPayload } from '../../../../shared/payloads/customer.payloads';
import { FormControl } from '@angular/forms';
import { Customer } from '../../../../shared/models/customer.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotifyAction } from '../../../../shared/enums/notify.enum';
import { SnackbarService } from '../../../../shared/services/snackbar.service';
import { getHttpErrorStatusMessage } from '../../../../shared/utils/http-error-message.utils';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { CUSTOMER_PROJECT_HEADERS } from './customer-project.headers';
import { LookupsService } from '../../../../shared/services/lookups.service';
import { Project } from '../../../../shared/models/project.model';

@Component({
  selector: 'app-customer-projects',
  standalone: true,
  imports: [MatPaginatorModule, ReactiveFormsModule],
  templateUrl: './customer-projects.component.html',
  styleUrls: ['customer-projects.component.scss'],
})
export class CustomerProjectsComponent implements OnInit {
  // Leggiamo l’ID dalla route (es. /progetti/:id)
  private route = inject(ActivatedRoute);
  // Usiamo la history del browser per tornare indietro
  private location = inject(Location);
  private customersService = inject(CustomersService);
  private snackbarService = inject(SnackbarService);
  private lookupsService = inject(LookupsService)
  private destroyRef = inject(DestroyRef);

  isFetching = signal(false);
  loading = signal(true);
  error = signal<string | null>(null);

  selectedCustomer = input<Customer>()
  customerProjects = signal<Project[]>([]);

  companiesList = signal<any[]>([]);
  statusesList = signal<any[]>([]);
  customersList = signal<any[]>([]);

  projectNameFilter = new FormControl('');
  companyFilter = new FormControl('');
  statusFilter = new FormControl('');

  filterNameValue = signal<string>('');
  companyFilterValue = signal<string>('');
  customerFilterValue = signal<string>('');
  statusFilterValue = signal<string>('');

  companyDropdownOpen = signal(false);
  customerDropdownOpen = signal(false);
  statusDropdownOpen = signal(false);
  showAllCompanyOptions = signal(false);
  showAllCustomerOptions = signal(false);
  showAllStatusOptions = signal(false);

  currentPage = signal(this.customersService.customerProjectsPaginationData()?.currentPage || 1);
  pageSize = this.customersService.customerProjectsPaginationData()?.pageSize || 3;
  pagination = this.customersService.customerProjectsPaginationData;
  currentFilters = signal({
    companyId: null as string | null,
    projectStatusId: null as string | null,
    searchTerm: '' as string | null
  });

  constructor() {
    effect(() => {
      this.pagination();
    });
    effect(() => {
      const customer = this.selectedCustomer();
      if (customer?.id) {
        this.loadInitialData(customer.id);
      }
    });
  }

  private buildLoadCustomerProjectsErrorMessage(error: Error): string {
    return `Errore durante il caricamento dei progetti associati al cliente: ${getHttpErrorStatusMessage(error)}`;
  }

  filteredProjects = computed<Project[]>(() => this.customerProjects());

  projectNameFilterOptions = computed<Project[]>(() => {
    const term = this.filterNameValue().toLowerCase();
    const projectdata = this.customerProjects() ?? [];

    if (!term) return projectdata;

    return projectdata.filter(p => 
      p.name.toLowerCase() === term
    );
  });

  allFiltersApplied = computed<Project[]>(() => {
    let result = this.customerProjects() ?? [];
    const f = this.currentFilters();

    if (f?.companyId) {
      result = result.filter(p => String(p.companyId) === String(f.companyId));
    }
    if (f?.projectStatusId) {
      result = result.filter(p => String(p.projectStatusId) === String(f.projectStatusId));
    }
    if (f?.searchTerm) {
      const term = (f.searchTerm || '').toLowerCase();
      result = result.filter(p => (p.name || '').toLowerCase().includes(term));
    }

    return result;
  });

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

  optionName(option: any): string {
    return option?.name || option?.Name || option?.Id || option || '';
  }
  
  filterData: any = {};

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

    this.currentFilters.update(filters => ({ ...filters, companyId: companyId }));
    this.loadCustomerProjectsPage(this.selectedCustomer()?.id, 1); // Ricarica la prima pagina con il nuovo filtro

    this.companyDropdownOpen.set(false);
    this.showAllCompanyOptions.set(false);
  }

  clearCompanyFilter() {
    this.companyFilter.setValue('', { emitEvent: false });
    this.companyFilterValue.set('');

    this.currentFilters.update(filters => ({ ...filters, companyId: null }));
    this.loadCustomerProjectsPage(this.selectedCustomer()?.id, 1); // Ricarica la prima pagina senza il filtro

    this.companyDropdownOpen.set(false);
    this.showAllCompanyOptions.set(false);
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
    this.loadCustomerProjectsPage(this.selectedCustomer()?.id, 1); // Ricarica la prima pagina con il nuovo filtro
    
    this.statusDropdownOpen.set(false);
    this.showAllStatusOptions.set(false);
  }

  clearStatusFilter() {
    this.statusFilter.setValue('', { emitEvent: false });
    this.statusFilterValue.set('');

    this.currentFilters.update(filters => ({ ...filters, projectStatusId: null }));
    this.loadCustomerProjectsPage(this.selectedCustomer()?.id, 1); // Ricarica la prima pagina senza il filtro

    this.statusDropdownOpen.set(false);
    this.showAllStatusOptions.set(false);
  }

  clearProjectNameFilter() {
    this.projectNameFilter.setValue('', { emitEvent: false });
    this.filterNameValue.set('');
    this.currentFilters.update(filters => ({ ...filters, searchTerm: null }));
    this.loadCustomerProjectsPage(this.selectedCustomer()?.id, 1);
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
  }

  loadCustomerProjectsPage(customerId: string | undefined | null, page: number) {
    if (!customerId) return;

    this.currentPage.set(page);
    this.isFetching.set(true);
    this.error.set(null);

    const filtersToSend = {
      ...this.currentFilters(),
      companyId: typeof this.currentFilters().companyId === 'object' 
                ? (this.currentFilters().companyId as any)?.id 
                : this.currentFilters().companyId
    };

    this.customersService.loadActiveProjectsForCustomer(customerId, page, this.pageSize, filtersToSend).pipe(
      finalize(() => {
        this.isFetching.set(false);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (projects: Project[]) => {
        const companiesList = this.companiesList();
        const statusesList = this.statusesList();
        
        const companiesMap = new Map(companiesList.map(c => [c.name, c.id]));
        const statusesMap = new Map(statusesList.map(s => [s.name, s.id]));
        
        const enrichedProjects = projects.map(p => ({
          ...p,
          companyId: p.companyId || companiesMap.get(p.company) || null,
          projectStatusId: p.projectStatusId || statusesMap.get(p.projectStatus) || null
        }));

        this.customerProjects.set([...enrichedProjects]);
      },
      error: (error: Error) => {
        this.error.set(this.buildLoadCustomerProjectsErrorMessage(error));
        this.snackbarService.error(NotifyAction.Caricamento, 'progetti', 'Riprova')
        .onAction().subscribe(() => {
          this.loadCustomerProjectsPage(this.selectedCustomer()?.id, page);
        });
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.loadCustomerProjectsPage(this.selectedCustomer()?.id, event.pageIndex + 1);
  }


  readonly projectsHeaders: Partial<Record<keyof CustomerProjectSummaryPayload, string>> = CUSTOMER_PROJECT_HEADERS;
  readonly headersArray = Object.entries(this.projectsHeaders)
    .filter(([key]) => key !== 'id')
    .map(([key, label]) => ({
      key: key as keyof CustomerProjectSummaryPayload,
      label,
    }));

  loadInitialData(customerId: string) {
    this.isFetching.set(true);
    this.error.set(null);

    const reloadFiltersAndInterface = (companies: any[], statuses: any[], customers: any[]) => {
        this.companiesList.set(companies);
        this.statusesList.set(statuses);
        this.customersList.set(customers);

        const savedFilters = (this.customersService as any).currentFilters;
        if (savedFilters) {
            const sanitizedFilters = {
                ...savedFilters,
                companyId: savedFilters.companyId?.id || savedFilters.companyId
            };
            this.currentFilters.set(sanitizedFilters);
            
            const companyName = companies.find((c: any) => c.id === savedFilters.companyId)?.name;
            if (companyName) {
                this.companyFilter.setValue(companyName, { emitEvent: false });
                this.companyFilterValue.set(companyName.toLowerCase());
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

    forkJoin([
      this.customersService.loadActiveProjectsForCustomer(customerId ,this.currentPage(), this.pageSize, this.currentFilters()),
      this.lookupsService.loadAvailableCompanies(),
      this.lookupsService.loadProjectStatuses(),
      this.customersService.loadAvailableCustomers()
    ]).pipe(
      finalize(() => { this.isFetching.set(false); }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ([projects, companies, statuses, customers]) => {
        const companiesMap = new Map(companies.map((c: any) => [c.name, c.id]));
        const statusesMap = new Map(statuses.map((s: any) => [s.name, s.id]));
        
        const enrichedProjects = projects.map((p: Project) => ({
          ...p,
          companyId: p.companyId || companiesMap.get(p.company) || null,
          projectStatusId: p.projectStatusId || statusesMap.get(p.projectStatus) || null
        }));
        
        this.customerProjects.set(enrichedProjects);
        reloadFiltersAndInterface(companies, statuses, customers)
      },
      error: (error) => this.buildLoadCustomerProjectsErrorMessage(error)
    });

  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID cliente mancante.');
      this.loading.set(false);
      return;
    }

    if (!id) {
      this.error.set('ID cliente mancante.');
      this.loading.set(false);
      return;
    }

        const savedFilters = (this.customersService as any).currentFilters;
        if (savedFilters) {
            this.currentFilters.set(savedFilters);
        } else {
          this.currentFilters.set({
            companyId: null,
            projectStatusId: null,
            searchTerm: null
          });
        }
    
        this.companyFilter.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          tap(value => {
            const filterValue = value || '';
            this.companyFilterValue.set(filterValue.toLowerCase());
            this.showAllCompanyOptions.set(false);
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

        this.projectNameFilter.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          tap(value => {
            const v = (value || '').toLowerCase();
            this.filterNameValue.set(v);
            this.currentFilters.update(filters => ({ ...filters, searchTerm: v || null }));
            this.loadCustomerProjectsPage(this.selectedCustomer()?.id, 1);
          }),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe();

  }

  getValue(p: Project, key: keyof Project): string {
    const projectValue = p[key];

    // format base (evita [object Object])
    if (projectValue == null) return '';
    if (Array.isArray(projectValue)) return projectValue.join(', ');
    if (typeof projectValue === 'object') return JSON.stringify(projectValue);
    return String(projectValue);
  }

  indietro() {
    this.location.back();
  }
}
