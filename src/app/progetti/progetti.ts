import { Component, EventEmitter, Output } from '@angular/core';
import { TableRowComponent } from '../shared/table-row/table-row';
import { Progetto } from './progetto/progetto.model';
import { Column } from '../shared/table-row/table.types';
import { PROGETTI_DUMMY } from './progetti-dummy';
import { ProgettoComponent } from "./progetto/progetto";
import { AppButton } from "../shared/button/button";

@Component({
  selector: 'app-progetti',
  imports: [TableRowComponent, ProgettoComponent, AppButton],
  templateUrl: './progetti.html',
  styleUrl: './progetti.css',
  
})

export class Progetti {

  dummyProgetti = PROGETTI_DUMMY;

  readonly PROGETTO_HEADERS: Record<keyof Progetto, string> = {
  Attività: 'Attività',
  Descrizione: 'Descrizione',
  Status: 'Stato',
  Cliente: 'Cliente',
  Referente: 'Referente',
  Azienda: 'Azienda',
  PM: 'Project Manager',
  Giorni: 'Giorni',
  winPercentual: 'Win %',
  }; // Record per inserire i titoli (headers) dei dati della tabella Progetti corrispondenti ai parametri del tipo Progetto

  columns: Column<Progetto>[] =
    (Object.keys(this.PROGETTO_HEADERS) as (keyof Progetto)[])
      .map(key => ({
        header: this.PROGETTO_HEADERS[key],
        value: p => p[key] as any,
      }
    )
  ); // mappatura fra il tipo di colonne e gli headers ed i rispettivi valori del tipo Progetto

  get progettiColsCount(): number{
    return this.columns.length;
  }


}


