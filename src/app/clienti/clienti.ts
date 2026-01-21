import { Component } from '@angular/core';
import { TableRowComponent } from "../shared/table-row/table-row";
import { CLIENTI_DUMMY } from './clienti-dummy';
import { CLIENTE_HEADERS } from './cliente/cliente.headers';
import { Cliente } from './cliente/cliente';
import { Column } from '../shared/table-row/table.types';
import { ModelloCliente } from './cliente/cliente.model';

@Component({
  selector: 'app-clienti',
  imports: [TableRowComponent, Cliente],
  templateUrl: './clienti.html',
  styleUrl: './clienti.css',
})
export class Clienti {
    dummyClienti = CLIENTI_DUMMY;
  
    readonly headersClienti = CLIENTE_HEADERS // Record per inserire i titoli (headers) dei dati della tabella Clienti corrispondenti ai parametri del tipo Cliente
  
    columns: Column<ModelloCliente>[] =
      (Object.keys(this.headersClienti) as (keyof ModelloCliente)[])
        .map(key => ({
          header: this.headersClienti[key],
          value: p => p[key] as any,
        }
      )
    ); // mappatura fra il tipo di colonne e gli headers ed i rispettivi valori del tipo Cliente
  
    get clientiColsCount(): number{
      return this.columns.length;
    }
}
