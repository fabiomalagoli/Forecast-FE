import { Component, computed, DestroyRef, effect, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableRowComponent } from '../shared/table-row/table-row';
import { CLIENTE_HEADERS } from './cliente/cliente.headers';
import { Cliente } from './cliente/cliente.model';
import { Column } from '../shared/table-row/table.types';
import { NewClienteComponent } from './new-cliente/new-cliente';
import { ClienteComponent } from './cliente/cliente';
import { AppButtonComponent } from '../shared/button/button';
import { RequestsService } from '../shared/requests.service';
import { ModificaClienteComponent } from './modifica/modifica';
import { v4 as uuidv4 } from 'uuid';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, tap } from 'rxjs';

@Component({
  selector: 'app-clienti',
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, NewClienteComponent, ModificaClienteComponent],
  templateUrl: './clienti.html',
  styleUrls: ['./clienti.css', '../shared/filter-styles.css'],
})
export class ClientiComponent {

  private requestsService = inject(RequestsService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  //dummyClienti = CLIENTI_DUMMY;
  Clienti = this.requestsService.clientiCaricati;


  isFetching = signal(false);
  error = signal('');
  statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);


  isClienteInAggiunta = false;
  clienteInModifica = signal<Cliente | null>(null);


  //Record per inserire i titoli (headers) dei dati della tabella Clienti corrispondenti ai parametri del tipo Cliente.
  readonly headersClienti = CLIENTE_HEADERS;
  //Mappatura fra il tipo di colonne e gli headers ed i rispettivi valori del tipo Cliente.
  columns: Column<Cliente>[] = [
    {
      header: 'Nome',
      value: (cliente) => cliente.name,
    },
    {
      header: 'Indirizzo',
      value: (cliente) => this.formatIndirizzo(cliente),
    },
    {
      header: 'Progetti Attivi',
      value: (cliente) => cliente.projects,
    },
  ];


  nomeCliente = signal<string | null>(null);
  filtroNomeCliente = new FormControl('');
  showAllCustomersOptions = signal(false);
  customerDropDownOpen = signal(false);
  filtroNomeValue = signal<string>('');

  clientiFiltrati = computed<Cliente[]>(() => {
    const hasFilters = !!this.filtroNomeValue();

    return this.Clienti().filter((cliente) => 
    cliente.name.toLowerCase().includes(this.filtroNomeValue())
    );
  })

  customerFilterOptions = computed<Cliente[]>(() => {
    const term = this.showAllCustomersOptions()
      ? ''
      : this.filtroNomeValue().toLowerCase();
    const customersData = this.Clienti() ?? [];

    if(!term){
      return customersData;
    }

    return customersData.filter(c => 
      this.optionName(c).toLowerCase().includes(term)
    );

  });

  ngOnInit() {
    this.isFetching.set(true);
    const subscription = this.requestsService.caricaClientiDisponibili().pipe(
      finalize(() => this.isFetching.set(false))
    ).subscribe({
      error: (error: Error) => {
        this.error.set(error.message);
      },
    });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });

    this.filtroNomeCliente.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => this.filtroNomeValue.set(value?.toLowerCase() || ''))
    ).subscribe();
  }

  aggiornaClienti() {
    this.isFetching.set(true);
    const timeoutId = setTimeout(() => {
      const subscription = this.requestsService.caricaClientiDisponibili().pipe(
        finalize(() => this.isFetching.set(false))
      ).subscribe({
        error: (error: Error) => {
          this.error.set(error.message);
        },
      });

      this.destroyRef.onDestroy(() => {
        subscription.unsubscribe();
      });
    }, 3000); //Ritardo di 3 secondi prima della richiesta.

    this.destroyRef.onDestroy(() => {
      clearTimeout(timeoutId);
    });
  }

  ricaricaClienti() {
    this.isFetching.set(true);
    const subscription = this.requestsService.caricaClientiDisponibili().pipe(
      finalize(() => this.isFetching.set(false))
    ).subscribe({
      error: (error: Error) => {
        this.error.set(error.message);
        this.showNotification('Errore nel caricamento dei clienti', 'error');
      },
    });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }

  get clientiColsCount(): number {
    return this.columns.length;
  }

  onAggiuntaCliente() {
    this.isClienteInAggiunta = true;
  }

  annullaAggiuntaCliente() {
    this.isClienteInAggiunta = false;
  }

  aggiungiCliente(newCliente: Cliente) {
    // Invece di aggiornare localmente, ricarica i dati dal backend
    this.ricaricaClienti();
    this.isClienteInAggiunta = false;
    this.showNotification('Cliente creato con successo!', 'success');
  }

  apriVisualizzaCliente(id: string) {
    this.router.navigate(['/clienti', id]);
  }

  apriModifica(c: Cliente) {
    this.clienteInModifica.set(c); // Fa apparire l' @if nel template
  }

  chiudiModifica() {
    this.clienteInModifica.set(null);
  }

  salvaModifica(clienteAggiornato: Cliente) {
    // Ricarica i dati dal backend per riflettere le modifiche effettive
    this.ricaricaClienti();
    this.chiudiModifica();
    this.showNotification('Modifiche salvate correttamente!', 'success');
  }

  showNotification(text: string, type: 'success' | 'error') {
    this.statusMessage.set({ text, type });
    setTimeout(() => this.statusMessage.set(null), 3000);
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

  selectCustomerFilter(c: Cliente) {
    const customerName = this.optionName(c);
    this.filtroNomeCliente.setValue(customerName);
    this.filtroNomeValue.set(customerName.toLowerCase())
    this.customerDropDownOpen.set(false);
    this.showAllCustomersOptions.set(false);
  }

  clearCustomerFilter() {
    this.filtroNomeCliente.setValue('');
    this.filtroNomeValue.set('');
    this.customerDropDownOpen.set(false);
    this.showAllCustomersOptions.set(false);
  }


  private formatIndirizzo(cliente: Cliente): string {
    const parti: string[] = [];

    if (cliente.address) parti.push(cliente.address);
    if (cliente.streetNumber) parti.push(cliente.streetNumber);
    if (cliente.city) parti.push(cliente.city);
    if (cliente.province) parti.push(`(${cliente.province})`);
    if (cliente.postalCode) parti.push(cliente.postalCode);
    if (cliente.country && cliente.country !== 'Italia') parti.push(cliente.country);

    if (parti.length > 0) {
      return parti.join(', ');
    }

    if (cliente.fullAddress) {
      return cliente.fullAddress;
    }

    return 'Indirizzo non specificato';
  }

  private generateId(): string {
    return uuidv4();
  }
}
