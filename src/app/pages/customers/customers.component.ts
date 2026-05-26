import { Component, computed, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CUSTOMER_HEADERS } from './customer/customer.headers';
import { Customer } from '../../shared/models/customer.model';
import { Column } from '../../shared/table-row/table.types';
import { NewCustomerComponent } from './new-customer/new-customer.component';
import { AppButtonComponent } from '../../shared/button/button';
import { EditCustomerComponent } from './edit-customer/edit-customer.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, Subject, switchMap, tap, timer } from 'rxjs';
import { CustomersService } from '../../shared/services/customers.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { NotifyAction } from '../../shared/enums/notify.enum';

@Component({
  selector: 'app-customers',
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, NewCustomerComponent, EditCustomerComponent, MatProgressSpinnerModule],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss'],
})
export class CustomersComponent {

  private customersService = inject(CustomersService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private snackbarService = inject(SnackbarService);


  customers = this.customersService.loadedCustomers;


  isInitialLoading = signal(this.customersService.loadedCustomers().length === 0);
  isFetching = signal(false);
  error = signal<string | null>(null);


  private showMessage$ = new Subject<{text: string, type: 'success' | 'error'}>();
  statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

  private buildLoadCustomersErrorMessage(error: Error): string {
    return `Errore durante il caricamento dei clienti: ${error.message}`;
  }


  isAddingCustomerState = false;
  editingCustomer = signal<Customer | null>(null);


  //Record per inserire i titoli (headers) dei dati della tabella Clienti corrispondenti ai parametri del tipo Cliente.
  readonly customerHeaders = CUSTOMER_HEADERS;
  //Mappatura fra il tipo di colonne e gli headers ed i rispettivi valori del tipo Cliente.
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
    return this.customers().filter((cliente) => 
    cliente.name.toLowerCase().includes(this.filterNameValue())
    );
  })

  customerFilterOptions = computed<Customer[]>(() => {
    const term = this.showAllCustomersOptions()
      ? ''
      : this.filterNameValue().toLowerCase();
    const customersData = this.customers() ?? [];

    if(!term){
      return customersData;
    }

    return customersData.filter(c => 
      this.optionName(c).toLowerCase().includes(term)
    );

  });

  constructor() {
    this.showMessage$.pipe(
      tap(msg => this.statusMessage.set(msg)),
      switchMap(() => timer(3000)),
      takeUntilDestroyed()
    ).subscribe(() => {
        this.statusMessage.set(null);
    });
  }

  loadInitialData() {
    this.isFetching.set(true);
    this.error.set(null);

    this.customersService.loadAvailableCustomers().pipe(
      finalize(() => {timer(1500).subscribe(() => { this.isInitialLoading.set(false); this.isFetching.set(false); }); }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      error: (error: Error) => {
        this.error.set(this.buildLoadCustomersErrorMessage(error));
        this.snackbarService.error(NotifyAction.Caricamento, 'clienti', 'Riprova')
        .onAction().subscribe(() => {
          this.loadInitialData(); //TO-DO: impaginazione 
        });
      }
    });
  }

  ngOnInit() {
    this.loadInitialData();

    this.filterCustomerName.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => this.filterNameValue.set(value?.toLowerCase() || ''))
    ).subscribe();
  }

  updateCustomers() {
    this.isFetching.set(true);
    const timeoutId = setTimeout(() => {
      this.customersService.loadAvailableCustomers().pipe(
        finalize(() => this.isFetching.set(false)),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        error: (error: Error) => {
          this.error.set(this.buildLoadCustomersErrorMessage(error));
          this.showNotification('error', NotifyAction.Aggiornamento, 'clienti');
        },
      });
    }, 3000); //Ritardo di 3 secondi prima della richiesta.

    this.destroyRef.onDestroy(() => {
      clearTimeout(timeoutId);
    });
  }

  reloadCustomers() {
    this.isFetching.set(true);
    this.customersService.loadAvailableCustomers().pipe(
      finalize(() => this.isFetching.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      error: (error: Error) => {
        this.error.set(this.buildLoadCustomersErrorMessage(error));
        this.showNotification('error', NotifyAction.Ricaricamento, 'clienti');
      },
    });
  }

  get clientiColsCount(): number {
    return this.columns.length;
  }

  onAddingCustomer() {
    this.isAddingCustomerState = true;
  }

  cancelCustomerAddition() {
    this.isAddingCustomerState = false;
  }

  addCustomer() {
    // Invece di aggiornare localmente, ricarica i dati dal backend
    this.reloadCustomers();
    this.isAddingCustomerState = false;
    this.showNotification('success', NotifyAction.Creazione, 'cliente');
  }

  openCustomerDetails(id: string) {
    this.router.navigate(['/clienti', id]);
  }

  openCustomerEditing(c: Customer) {
    this.editingCustomer.set(c); // Fa apparire l' @if nel template
  }

  closeCustomerEditing() {
    this.editingCustomer.set(null);
  }

  saveEdits() {
    // Ricarica i dati dal backend per riflettere le modifiche effettive
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
  
  optionName(option: any): string {
      return option?.name || option?.Name || option || '';
  }

  onCustomerFilterFocus() {
    this.showAllCustomersOptions.set(true);
    this.customerDropDownOpen.set(true);
  }

  onCustomerFilterInput() {
    this.showAllCustomersOptions.set(false);
    this.customerDropDownOpen.set(true);
  }

  toggleCustomerFilterDropdown() {
    this.showAllCustomersOptions.set(true);
    this.customerDropDownOpen.update(open => !open);
  }

  @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent) {
        const target = event.target as Element | null;

        if (!target?.closest('.role-filter-combo')) {
            this.customerDropDownOpen.set(false);
            this.showAllCustomersOptions.set(false);
        }
    }

  selectCustomerFilter(c: Customer) {
    const customerName = this.optionName(c);
    this.filterCustomerName.setValue(customerName);
    this.filterNameValue.set(customerName.toLowerCase())
    this.customerDropDownOpen.set(false);
    this.showAllCustomersOptions.set(false);
  }

  clearCustomerFilter() {
    this.filterCustomerName.setValue('');
    this.filterNameValue.set('');
    this.customerDropDownOpen.set(false);
    this.showAllCustomersOptions.set(false);
  }


  private addressFormatting(customer: Customer): string {
    const parti: string[] = [];

    if (customer.address) parti.push(customer.address);
    if (customer.streetNumber) parti.push(customer.streetNumber);
    if (customer.city) parti.push(customer.city);
    if (customer.province) parti.push(`(${customer.province})`);
    if (customer.postalCode) parti.push(customer.postalCode);
    if (customer.country && customer.country !== 'Italia') parti.push(customer.country);

    if (parti.length > 0) {
      return parti.join(', ');
    }

    if (customer.fullAddress) {
      return customer.fullAddress;
    }

    return 'Indirizzo non specificato';
  }

}
