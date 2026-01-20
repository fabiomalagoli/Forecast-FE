import { Component, EventEmitter, Output } from '@angular/core';
import { TableRowComponent } from '../shared/table-row/table-row';
import { Progetto } from './progetto/progetto.model';
import { Column } from '../shared/table-row/table.types';
import { PROGETTI_DUMMY } from './progetti-dummy';
import { ProgettoComponent } from "./progetto/progetto";
import { AppButton } from "../shared/button/button";
import { PROGETTO_HEADERS } from './progetto/progetto.headers';
import { NewProgettoComponent } from "./new-progetto/new-progetto";

@Component({
  selector: 'app-progetti',
  imports: [TableRowComponent, ProgettoComponent, AppButton, NewProgettoComponent],
  templateUrl: './progetti.html',
  styleUrl: './progetti.css',
  
})

export class Progetti {

  isProgettoInAggiunta = false;

  dummyProgetti = PROGETTI_DUMMY;

  readonly headersProgetti = PROGETTO_HEADERS // Record per inserire i titoli (headers) dei dati della tabella Progetti corrispondenti ai parametri del tipo Progetto

  columns: Column<Progetto>[] =
    (Object.keys(this.headersProgetti) as (keyof Progetto)[])
      .map(key => ({
        header: this.headersProgetti[key],
        value: p => p[key] as any,
      }
    )
  ); // mappatura fra il tipo di colonne e gli headers ed i rispettivi valori del tipo Progetto

  get progettiColsCount(): number{
    return this.columns.length;
  }

  onAggiuntaProgetto(){
    this.isProgettoInAggiunta = true;
  }

  aggiungiProgetto(newProgetto: Progetto){
    this.dummyProgetti = [...this.dummyProgetti, newProgetto];
    this.isProgettoInAggiunta = false;
  }

  annullaAggiuntaProgetto(){
    this.isProgettoInAggiunta = false;
  }

}


