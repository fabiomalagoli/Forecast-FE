import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { TableRowComponent } from '../shared/table-row/table-row';
import { Progetto } from './progetto/progetto.model';
import { Column } from '../shared/table-row/table.types';
// import { PROGETTI_DUMMY } from './progetti-dummy';
import { ProgettoComponent } from "./progetto/progetto";
import { AppButton } from "../shared/button/button";
import { PROGETTO_HEADERS } from './progetto/progetto.headers';
import { PROGETTO_COMPLETO_HEADERS } from './progetto/progetto-completo.headers';
import { NewProgettoComponent } from "./new-progetto/new-progetto";
import { RequestsService } from '../shared/requests.service';
import { Router } from '@angular/router';
import { ModificaComponent } from "./progetto/modifica/modifica";
import { effect } from '@angular/core';
import { Visualizza } from './progetto/visualizza/visualizza';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, forkJoin, switchMap, tap } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-progetti',
  imports: [AppButton, NewProgettoComponent, ModificaComponent, ReactiveFormsModule],
  templateUrl: './progetti.html',
  styleUrls: ['../shared/filter-styles.css', './progetti.css'],
  
})

export class Progetti {

  isFetching = signal(false);
  error = signal('');
  private requestsService = inject(RequestsService);
  private destroyRef = inject(DestroyRef);
  statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);
  progetti = this.requestsService.progettiCaricati;

  isProgettoInAggiunta = signal<boolean | null>(null);

  progettoInModifica = signal<Progetto | null>(null);

  listaAziende = signal<any[]>([]);
  listaStati = signal<any[]>([]);
  listaClienti = signal<any[]>([]);

  // dummyProgetti = PROGETTI_DUMMY;

  readonly headersProgetti: Partial<Record<keyof Progetto, string>> = PROGETTO_COMPLETO_HEADERS;  // Record per inserire i titoli (headers) dei dati della tabella Progetti corrispondenti ai parametri del tipo Progetto

  // Router per spostarci tra pagine/viste dei progetti
  constructor(private router: Router) {
    // Questo log scatterà ogni singola volta che il segnale del service cambia
    effect(() => {
      console.log('IL SEGNALE È CAMBIATO! Nuova lista:', this.progetti());
    });
  }

  filtroAzienda = new FormControl('');
  filtroCliente = new FormControl('');
  filtroStato = new FormControl('');
  filtroAziendaValue = signal<string>('');
  filtroClienteValue = signal<string>('');
  filtroStatoValue = signal<string>('');
  companyDropdownOpen = signal(false);
  customerDropdownOpen = signal(false);
  statusDropdownOpen = signal(false);
  showAllCompanyOptions = signal(false);
  showAllCustomerOptions = signal(false);
  showAllStatusOptions = signal(false);

  companyFilterOptions = computed<any[]>(() => {
    const term = this.showAllCompanyOptions()
      ? ''
      : this.filtroAziendaValue().toLowerCase();
    const companies = this.listaAziende();

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
      : this.filtroClienteValue().toLowerCase();
    const customers = this.listaClienti();

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
      : this.filtroStatoValue().toLowerCase();
    const statuses = this.listaStati();

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
    const subscription = this.requestsService.caricaProgettiDisponibili()
      .subscribe({
        // Non serve più il next con this.Progetti.set(): caricaProgettiDisponibili fa già il tap() sul segnale
        error: (error: Error) => {
          this.error.set(error.message);
        },
        complete: () => {
          this.isFetching.set(false);
        }
      });

      this.destroyRef.onDestroy(() => {
        subscription.unsubscribe();
      });

    // Imposta i listener per i filtri
    this.filtroAzienda.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => {
        const filterValue = value || '';
        this.filtroAziendaValue.set(filterValue.toLowerCase());
        this.showAllCompanyOptions.set(false);
        this.requestsService.setFiltroAzienda(filterValue);
      })
    ).subscribe();

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });

    this.filtroCliente.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => {
        const filterValue = value || '';
        this.filtroClienteValue.set(filterValue.toLowerCase());
        this.showAllCustomerOptions.set(false);
        this.requestsService.setFiltroClienteInProgetti(filterValue);
      })
    ).subscribe();

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });

    this.filtroStato.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => {
        this.filtroStatoValue.set((value || '').toLowerCase());
        this.showAllStatusOptions.set(false);
      })
    ).subscribe();

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });

    const caricamenti = [
      this.requestsService.caricaAziendeDisponibili(),
      this.requestsService.caricaStatiProgettoDisponibili(),
      this.requestsService.caricaClientiDisponibili(),
    ];
    // Carica tutte le liste necessarie per i dropdown in parallelo
    forkJoin(caricamenti).subscribe(risultati => {
      this.listaAziende.set(risultati[0]);
      this.listaStati.set(risultati[1]);
      this.listaClienti.set(risultati[2]);
      this.filterData.companyId = risultati[0].find(a => a.name === this.filterData.company)?.id || null;
      this.filterData.customerId = risultati[2].find(c => c.name === this.filterData.customer)?.id || null;
      this.filterData.projectStatusId = risultati[1].find(s => s.name === this.filterData.projectStatus)?.name || null;
    });



  }

  columns: Column<Progetto>[] =
    (Object.keys(this.headersProgetti) as (keyof Progetto)[])
      .filter(key => key !== 'id' && key in PROGETTO_HEADERS) // Escludi il campo 'id' e tieni solo quelli visibili
      .map(key => ({
        header: this.headersProgetti[key] ?? '',
        value: (p: Progetto) => p[key] as any,
      }))
      .filter(column => column.header !== '');

  get progettiColsCount(): number{
    return this.columns.length;
  }

  onAggiuntaProgetto(){
    this.isProgettoInAggiunta.set(true);
  }

  aggiungiProgetto(newProgetto: any) {
    this.isProgettoInAggiunta.set(false);
    this.showNotification('Progetto creato con successo!', 'success');
  }

  annullaAggiuntaProgetto(){
    this.isProgettoInAggiunta.set(false);
  }

  aggiornaProgetti(){
    this.isFetching.set(true);
    const timeoutId = setTimeout(() => {
      const subscription = this.requestsService.caricaProgettiDisponibili()
        .subscribe({ // Non serve più il next con this.Progetti.set(): caricaProgettiDisponibili fa già il tap() sul segnale
          error: (error: Error) => {
            this.error.set(error.message);
          },
          complete: () => {
            this.isFetching.set(false);
          }
        });

      this.destroyRef.onDestroy(() => {
        subscription.unsubscribe();
      });
    }, 3000); // Ritardo di 3 secondi prima della richiesta

    this.destroyRef.onDestroy(() => {
      clearTimeout(timeoutId);
    });
  }

  apriModifica(p: Progetto) {
    this.progettoInModifica.set(p); // Fa apparire l' @if nel template
  }

  chiudiModifica() {
    this.progettoInModifica.set(null);
  }

  salvaModifica(progettoAggiornato: Progetto) {
    this.progettoInModifica.set(null);
    // Qui potresti chiamare un metodo del service per salvare le modifiche sul backend, ad esempio:
    this.requestsService.caricaProgettiDisponibili().subscribe({
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
    this.filtroCliente.setValue(customerName);
    this.filtroClienteValue.set(customerName.toLowerCase());
    this.customerDropdownOpen.set(false);
    this.showAllCustomerOptions.set(false);
  }

  clearCustomerFilter() {
    this.filtroCliente.setValue('');
    this.filtroClienteValue.set('');
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
    this.filtroStato.setValue(statusName);
    this.filtroStatoValue.set(statusName.toLowerCase());
    this.requestsService.setFiltroStato(statusId);
    this.statusDropdownOpen.set(false);
    this.showAllStatusOptions.set(false);
  }

  clearStatusFilter() {
    this.filtroStato.setValue('');
    this.filtroStatoValue.set('');
    this.requestsService.setFiltroStato('');
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

  apriPaginaVisualizza(id: string){
    this.router.navigate(['/progetti', id]);
  }

}
