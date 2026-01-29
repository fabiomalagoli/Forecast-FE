import { Component, DestroyRef, inject, signal } from '@angular/core';
import { TableRowComponent } from '../shared/table-row/table-row';
import { CLIENTI_DUMMY } from './clienti-dummy';
import { CLIENTE_HEADERS } from './cliente/cliente.headers';
import { Cliente } from './cliente/cliente';
import { Column } from '../shared/table-row/table.types';
import { ModelloCliente } from './cliente/cliente.model';
import { NewCliente } from './new-cliente/new-cliente';
import { AppButton } from '../shared/button/button';
import { RequestsService } from '../shared/requests.service';

@Component({
  selector: 'app-clienti',
  imports: [AppButton, TableRowComponent, Cliente, NewCliente],
  templateUrl: './clienti.html',
  styleUrl: './clienti.css',
})
export class Clienti {
  Clienti = signal<ModelloCliente[] | undefined>(undefined);
  isFetching = signal(false);
  error = signal('');
  private requestsService = inject(RequestsService);
  private destroyRef = inject(DestroyRef);
  isClienteInAggiunta = false;

  dummyClienti = CLIENTI_DUMMY;
  //Record per inserire i titoli (headers) dei dati della tabella Clienti corrispondenti ai parametri del tipo Cliente.
  readonly headersClienti = CLIENTE_HEADERS;

  ngOnInit() {
    this.isFetching.set(true);
    const subscription = this.requestsService.caricaClientiDisponibili().subscribe({
      next: (clienti: ModelloCliente[]) => {
        console.log('Clienti caricati:', clienti); // Log per verificare i dati
        this.Clienti.set(clienti);
      },
      error: (error: Error) => {
        this.error.set(error.message);
      },
      complete: () => {
        this.isFetching.set(false);
      },
    });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }

  //Mappatura fra il tipo di colonne e gli headers ed i rispettivi valori del tipo Cliente.
  columns: Column<ModelloCliente>[] = (Object.keys(this.headersClienti) as (keyof ModelloCliente)[])
    .filter((key) => key !== 'id')
    .map((key) => ({
      header: this.headersClienti[key],
      value: (p) => p[key] as any,
    }));

  get clientiColsCount(): number {
    return this.columns.length;
  }

  onAggiuntaCliente() {
    this.isClienteInAggiunta = true;
  }

  annullaAggiuntaCliente() {
    this.isClienteInAggiunta = false;
  }

  aggiungiCliente(newCliente: ModelloCliente) {
    this.dummyClienti = [...this.dummyClienti, newCliente];
    this.isClienteInAggiunta = false;
  }
}
