import { Component, DestroyRef, HostListener, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CUSTOMER_HEADERS } from './customer/customer.headers';
import { Customer } from '../../shared/models/customer.model';
import { Column } from '../../shared/table-row/table.types';
import { NewCustomerComponent } from './new-customer/new-customer.component';
import { AppButtonComponent } from '../../shared/button/button';
import { EditCustomerComponent } from './edit-customer/edit-customer.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, Subject, switchMap, tap, timer } from 'rxjs';
import { CustomersService } from '../../shared/services/customers.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { NotifyAction } from '../../shared/enums/notify.enum';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { getHttpErrorStatusMessage } from '../../shared/utils/http-error-message.utils';
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteDialogComponent } from '../../shared/components/confirm-delete-dialog/confirm-delete-dialog';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    AppButtonComponent, 
    NewCustomerComponent, 
    EditCustomerComponent, 
    MatProgressSpinnerModule, 
    MatPaginatorModule, 
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule
  ],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss'],
})
export class CustomersComponent implements OnInit {

  private customersService = inject(CustomersService);
  // private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private snackbarService = inject(SnackbarService);
  private isFromDetailsPage = signal(false);
  private dialog = inject(MatDialog);

  customers = this.customersService.loadedCustomers;

  isInitialLoading = signal(this.customersService.loadedCustomers().length === 0);
  isFetching = signal(false);
  error = signal<string | null>(null);

  private showMessage$ = new Subject<{text: string, type: 'success' | 'error'}>();
  statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

  isAddingCustomer = signal(false);
  editingCustomer = signal<Customer | null>(null);

  deletingCustomerId = signal<string | null>(null);
  selectedCustomersIds = signal<string[]>([]);

  currentPage = signal(this.customersService.customerPaginationData()?.currentPage || 1);
  pageSize = this.customersService.customerPaginationData()?.pageSize || 10;
  pagination = this.customersService.customerPaginationData;
  currentFilters = signal({ searchTerm: null as string | null });

  AllCustomers = this.customersService.loadedCustomers;

  readonly customerHeaders = CUSTOMER_HEADERS;
  
  columns: Column<Customer>[] = [
    {
      header: 'Nome',
      value: (cliente) => cliente.name,
    },
    {
      header: 'Indirizzo',
      value: (cliente) => this.addressFormatting(cliente),
    },
    {
      header: 'Progetti Attivi',
      value: (cliente) => cliente.projects,
    },
  ];

  customerName = signal<string | null>(null);
  filterCustomerName = new FormControl('');
  showAllCustomersOptions = signal(false);
  customerDropDownOpen = signal(false);
  filterNameValue = signal<string>('');

  filteredCustomers = computed<Customer[]>(() => {
    return this.customers().filter(c => !c.isEliminated);
  });

  customerFilterOptions = computed<Customer[]>(() => {
    const term = this.showAllCustomersOptions() ? '' : this.filterNameValue().toLowerCase();
    const customersData = this.customers() ?? [];

    if (!term) return customersData;

    return customersData.filter(c => 
      this.optionName(c).toLowerCase().includes(term)
    );
  });

  constructor(private router: Router) {

    const currentNav = this.router.currentNavigation();
    const previousUrl = currentNav?.previousNavigation?.finalUrl?.toString() || '';

    this.isFromDetailsPage.set(previousUrl.includes(`/clienti/`));

    if(!this.isFromDetailsPage()) {
      (this.customersService as any).currentFilters = { searchTerm: null as string | null };
    }

    this.showMessage$.pipe(
      tap(msg => this.statusMessage.set(msg)),
      switchMap(() => timer(3000)),
      takeUntilDestroyed()
    ).subscribe(() => {
        this.statusMessage.set(null);
    });
  }

  loadInitialData(forceInitialSpinner = false) {
    const dataAlreadyLoaded = this.customersService.loadedCustomers().length > 0;

    this.isFetching.set(true);
    this.isInitialLoading.set(forceInitialSpinner || !dataAlreadyLoaded);
    this.error.set(null);

    forkJoin([
      this.customersService.loadCustomers(this.currentPage(), this.pageSize, this.currentFilters()),
      timer(1500)
    ]).pipe(
      finalize(() => {
        this.isInitialLoading.set(false);
        this.isFetching.set(false);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      error: (error: Error) => {
        this.error.set(this.buildLoadCustomersErrorMessage(error));
        this.snackbarService.error(NotifyAction.Caricamento, 'clienti', 'Riprova')
          .onAction().subscribe(() => {
            this.loadInitialData(true); 
          });
      }
    });
  }

  ngOnInit() {
    this.error.set(null);

    const savedSearchTerm = (this.customersService as any).currentFilters?.searchTerm || null;
    if (savedSearchTerm) {
      this.currentFilters.set({ searchTerm: savedSearchTerm });
      this.filterCustomerName.setValue(savedSearchTerm, { emitEvent: false });
      this.filterNameValue.set(savedSearchTerm.toLowerCase());
    }
    else {
      this.currentFilters.set({ searchTerm: null });
      this.filterCustomerName.setValue('', { emitEvent: false });
      this.filterNameValue.set('');
    }

    this.loadInitialData();

    this.filterCustomerName.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
      tap(value => this.filterNameValue.set(value?.toLowerCase() || ''))
    ).subscribe();
  }

  updateCustomers() {
    this.isFetching.set(true);

    timer(3000).pipe(
      switchMap(() => this.customersService.loadCustomers(this.currentPage(), this.pageSize, this.currentFilters())),
      finalize(() => this.isFetching.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      error: (error: Error) => {
        this.error.set(this.buildLoadCustomersErrorMessage(error));
        this.showNotification('error', NotifyAction.Aggiornamento, 'clienti');
      },
    });
  }

  reloadCustomers() {
    this.isFetching.set(true);
    this.customersService.loadCustomers(this.currentPage(), this.pageSize, this.currentFilters()).pipe(
      finalize(() => this.isFetching.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      error: (error: Error) => {
        this.error.set(this.buildLoadCustomersErrorMessage(error));
        this.showNotification('error', NotifyAction.Ricaricamento, 'clienti');
      },
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.loadPage(event.pageIndex + 1);
  }

  onDeleteCustomer(customer: Customer): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: { name: customer.name },
      disableClose: true // Impedisce di chiuderlo cliccando fuori per errore
    });

    // Risultato alla chiusura del form
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.deletingCustomerId.set(customer.id)
        this.onCustomerDeleted();
      }
    });
  }

  onCustomerDeleted(): void {
    const idToDelete = this.deletingCustomerId();
    if(idToDelete === null) return;

    this.isFetching.set(true);
    this.customersService.toggleEliminatedState(idToDelete, true).pipe(
      finalize(() => 
        {
          this.isFetching.set(false);
          this.deletingCustomerId.set(null);
        }
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.snackbarService.success(NotifyAction.Eliminazione, 'clienti');
        this.loadPage(this.currentPage());
      },
      error: () => {
        this.snackbarService.error(NotifyAction.Eliminazione, 'clienti', 'Chiudi');
      }
    })
  }

  loadPage(page: number, forceInitialSpinner = false) {
    this.isFetching.set(true);
    this.isInitialLoading.set(forceInitialSpinner);
    this.currentPage.set(page);
    this.error.set(null);

    this.customersService.loadCustomers(page, this.pageSize, this.currentFilters()).pipe(
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
      error: (error: Error) => {
        this.error.set(this.buildLoadCustomersErrorMessage(error));
        this.snackbarService.error(NotifyAction.Caricamento, 'clienti', 'Riprova')
          .onAction().subscribe(() => {
            this.loadPage(page, true); 
          });
      },
    });
  }

  get clientiColsCount(): number { return this.columns.length; }
  onAddingCustomer() { this.isAddingCustomer.set(true); }
  cancelCustomerAddition() { this.isAddingCustomer.set(false); }

  addCustomer(newCustomer: Customer) {
    this.isFetching.set(true);

  this.customersService.addCustomer(newCustomer).pipe(
    finalize(() => this.isFetching.set(false)),
    takeUntilDestroyed(this.destroyRef)
  ).subscribe({
    next: () => {
      this.reloadCustomers();
      this.isAddingCustomer.set(false);
      this.showNotification('success', NotifyAction.Creazione, 'cliente');
    },
    error: (error: Error) => {
      this.error.set(`Errore durante la creazione: ${error.message}`);
      this.showNotification('error', NotifyAction.Creazione, 'cliente');
    }
  });
  }

  openCustomerDetails(id: string) { this.router.navigate(['/clienti', id]); }
  openCustomerEditing(c: Customer) { this.editingCustomer.set(c); }
  closeCustomerEditing() { this.editingCustomer.set(null); }

  saveEdits() {
    this.reloadCustomers();
    this.closeCustomerEditing();
    this.showNotification('success', NotifyAction.Aggiornamento, 'cliente');
  }

  showNotification(type: 'success' | 'error', action: NotifyAction, params?: string | string[]) {
    if (type === 'success') {
      this.snackbarService.success(action, params);
    } else {
      this.snackbarService.error(action, params ?? []);
    }
  }
  
  optionName(option: any): string { return option?.name || option?.Name || option || ''; }

  onCustomerFilterFocus() { this.showAllCustomersOptions.set(true); this.customerDropDownOpen.set(true); }
  onCustomerFilterInput() { this.showAllCustomersOptions.set(false); this.customerDropDownOpen.set(true); }
  toggleCustomerFilterDropdown() { this.showAllCustomersOptions.set(true); this.customerDropDownOpen.update(open => !open); }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent) {
    const target = event.target as Element | null;
    if (!target?.closest('.customer-filter-combo')) {
      this.customerDropDownOpen.set(false);
      this.showAllCustomersOptions.set(false);
    }
  }

  selectCustomerFilter(c: Customer) {
    const customerName = this.optionName(c);
    this.filterCustomerName.setValue(customerName, { emitEvent: false });
    this.filterNameValue.set(customerName.toLowerCase());

    this.currentFilters.update(filters => ({ ...filters, searchTerm: customerName }));
    (this.customersService as any).currentFilters = { searchTerm: customerName };
    this.loadPage(1);

    this.customerDropDownOpen.set(false);
    this.showAllCustomersOptions.set(false);
  }

  clearCustomerFilter() {
    this.filterCustomerName.setValue('', { emitEvent: false });
    this.filterNameValue.set('');
    this.currentFilters.update(filters => ({ ...filters, searchTerm: null }));
    (this.customersService as any).currentFilters = { searchTerm: null };
    this.loadPage(1);
    this.customerDropDownOpen.set(false);
    this.showAllCustomersOptions.set(false);
  }

  private buildLoadCustomersErrorMessage(error: Error): string {
    return `Errore durante il caricamento dei clienti: ${getHttpErrorStatusMessage(error)}`;
  }

  private addressFormatting(customer: Customer): string {
    const parti: string[] = [];
    if (customer.address) parti.push(customer.address);
    if (customer.streetNumber) parti.push(customer.streetNumber);
    if (customer.city) parti.push(customer.city);
    if (customer.province) parti.push(`(${customer.province})`);
    if (customer.postalCode) parti.push(customer.postalCode);
    if (customer.country && customer.country !== 'Italia') parti.push(customer.country);

    if (parti.length > 0) return parti.join(', ');
    if (customer.fullAddress) return customer.fullAddress;
    return 'Indirizzo non specificato';
  }
}
