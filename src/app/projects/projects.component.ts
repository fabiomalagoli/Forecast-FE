import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { Project } from './project/project.model';
import { Column } from '../shared/table-row/table.types';
import { AppButtonComponent } from "../shared/button/button";
import { PROGETTO_HEADERS } from './project/project.headers';
import { COMPLETE_PROJECT_HEADERS } from './project/complete-project.headers';
import { NewProgettoComponent } from "./new-project/new-project.component";
import { Router } from '@angular/router';
import { EditProjectComponent } from "./project/edit-project/edit-project.component";
import { effect } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, tap } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { ProjectsService } from '../shared/services/projects.service';
import { LookupsService } from '../shared/services/lookups.service';
import { CustomersService } from '../shared/services/customers.service';


@Component({
  selector: 'app-projects',
  imports: [AppButtonComponent, NewProgettoComponent, EditProjectComponent, ReactiveFormsModule],
  templateUrl: './projects.component.html',
  styleUrls: ['../shared/filter-styles.css', './projects.component.css'],
  
})

export class ProjectsComponent {

  isFetching = signal(false);
  error = signal('');
  private projectsService = inject(ProjectsService);
  private lookupsService = inject(LookupsService);
  private customersService = inject(CustomersService);
  private destroyRef = inject(DestroyRef);
  statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);
  projects = this.projectsService.loadedProjects;

  isAddingProject = signal<boolean | null>(null);

  editingProject = signal<Project | null>(null);

  companiesList = signal<any[]>([]);
  statusesList = signal<any[]>([]);
  customersList = signal<any[]>([]);

  // dummyProgetti = PROGETTI_DUMMY;

  readonly projectHeaders: Partial<Record<keyof Project, string>> = COMPLETE_PROJECT_HEADERS;

  // Router per spostarci tra pagine/viste dei progetti
  constructor(private router: Router) {
    // Questo log scatterà ogni singola volta che il segnale del service cambia
    effect(() => {
      console.log('IL SEGNALE È CAMBIATO! Nuova lista:', this.projects());
    });
  }

  companyFilter = new FormControl('');
  customerFilter = new FormControl('');
  statusFilter = new FormControl('');

  companyFilterValue = signal<string>('');
  customerFilterValue = signal<string>('');
  statusFilterValue = signal<string>('');

  companyDropdownOpen = signal(false);
  customerDropdownOpen = signal(false);
  statusDropdownOpen = signal(false);
  showAllCompanyOptions = signal(false);
  showAllCustomerOptions = signal(false);
  showAllStatusOptions = signal(false);

  filteredProjects = computed<Project[]>(() => {
    const hasFilters = !!(
      this.companyFilterValue() ||
      this.customerFilterValue() ||
      this.statusFilterValue()
    );
    
    return this.projects().filter(project =>
      project.company.toLowerCase().includes(this.companyFilterValue()) &&
      project.customer.toLowerCase().includes(this.customerFilterValue()) &&
      project.projectStatus.toLowerCase().includes(this.statusFilterValue())
    );

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

  ngOnInit() {
    this.isFetching.set(true);
    const subscription = this.projectsService.loadAvailableProjects().pipe(
        finalize(() => this.isFetching.set(false))
      )
      .subscribe({
        // Non serve più il next con this.Progetti.set(): caricaProgettiDisponibili fa già il tap() sul segnale
        error: (error: Error) => {
          this.error.set(error.message);
        },
      });

      this.destroyRef.onDestroy(() => {
        subscription.unsubscribe();
      });

    // Imposta i listener per i filtri
    this.companyFilter.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => {
        const filterValue = value || '';
        this.companyFilterValue.set(filterValue.toLowerCase());
        this.showAllCompanyOptions.set(false);
        this.projectsService.setCompanyFilter(filterValue);
      })
    ).subscribe();

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });

    this.customerFilter.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => {
        const filterValue = value || '';
        this.customerFilterValue.set(filterValue.toLowerCase());
        this.showAllCustomerOptions.set(false);
        this.projectsService.setCustomerFilter(filterValue);
      })
    ).subscribe();

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });

    this.statusFilter.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => {
        this.statusFilterValue.set((value || '').toLowerCase());
        this.showAllStatusOptions.set(false);
      })
    ).subscribe();

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });

    const loadingRequests = [
      this.lookupsService.loadAvailableCompanies(),
      this.lookupsService.loadProjectStatuses(),
      this.customersService.loadAvailableCustomers(),
    ];
    // Carica tutte le liste necessarie per i dropdown in parallelo
    forkJoin(loadingRequests).subscribe(results => {
      this.companiesList.set(results[0]);
      this.statusesList.set(results[1]);
      this.customersList.set(results[2]);
      this.filterData.companyId = results[0].find(a => a.name === this.filterData.company)?.id || null;
      this.filterData.customerId = results[2].find(c => c.name === this.filterData.customer)?.id || null;
      this.filterData.projectStatusId = results[1].find(s => s.name === this.filterData.projectStatus)?.name || null;
    });



  }

  columns: Column<Project>[] =
    (Object.keys(this.projectHeaders) as (keyof Project)[])
      .filter(key => key !== 'id' && key in PROGETTO_HEADERS) // Escludi il campo 'id' e tieni solo quelli visibili
      .map(key => ({
        header: this.projectHeaders[key] ?? '',
        value: (p: Project) => p[key] as any,
      }))
      .filter(column => column.header !== '');

  get projectColumnsCount(): number{
    return this.columns.length;
  }

  openCreateProject(){
    this.isAddingProject.set(true);
  }

  onProjectCreated(newProject: any) {
    this.isAddingProject.set(false);
    this.showNotification('Progetto creato con successo!', 'success');
  }

  closeCreateProject(){
    this.isAddingProject.set(false);
  }

  refreshProjects(){
    this.isFetching.set(true);
    const timeoutId = setTimeout(() => {
      const subscription = this.projectsService.loadAvailableProjects().pipe(
          finalize(() => this.isFetching.set(false))
        )
        .subscribe({ // Non serve più il next con this.Progetti.set(): caricaProgettiDisponibili fa già il tap() sul segnale
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

  openEditProject(project: Project) {
    this.editingProject.set(project);
  }

  closeEditProject() {
    this.editingProject.set(null);
  }

  onProjectSaved(updatedProject: Project) {
    this.editingProject.set(null);
    // Qui potresti chiamare un metodo del service per salvare le modifiche sul backend, ad esempio:
    this.projectsService.loadAvailableProjects().subscribe({
      next: () => {
        this.showNotification('Dati aggiornati dal database', 'success');
      }
    });
  }

  showNotification(text: string, type: 'success' | 'error') {
    this.statusMessage.set({ text, type });
    setTimeout(() => this.statusMessage.set(null), 3000);
  }

  optionName(option: any): string {
    return option?.name || option?.Name || option || '';
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
    this.companyFilter.setValue(companyName);
    this.companyFilterValue.set(companyName.toLowerCase());
    this.companyDropdownOpen.set(false);
    this.showAllCompanyOptions.set(false);
  }

  clearCompanyFilter() {
    this.companyFilter.setValue('');
    this.companyFilterValue.set('');
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
    this.customerFilter.setValue(customerName);
    this.customerFilterValue.set(customerName.toLowerCase());
    this.customerDropdownOpen.set(false);
    this.showAllCustomerOptions.set(false);
  }

  clearCustomerFilter() {
    this.customerFilter.setValue('');
    this.customerFilterValue.set('');
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
    this.statusFilter.setValue(statusName);
    this.statusFilterValue.set(statusName.toLowerCase());
    this.projectsService.setStatusFilter(statusId);
    this.statusDropdownOpen.set(false);
    this.showAllStatusOptions.set(false);
  }

  clearStatusFilter() {
    this.statusFilter.setValue('');
    this.statusFilterValue.set('');
    this.projectsService.setStatusFilter('');
    this.statusDropdownOpen.set(false);
    this.showAllStatusOptions.set(false);
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

  openProjectDetails(id: string){
    this.router.navigate(['/progetti', id]);
  }

}
