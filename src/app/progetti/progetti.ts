import { Component, DestroyRef, inject, signal } from '@angular/core';
import { TableRowComponent } from '../shared/table-row/table-row';
import { Progetto } from './progetto/progetto.model';
import { Column } from '../shared/table-row/table.types';
// import { PROGETTI_DUMMY } from './progetti-dummy';
import { ProgettoComponent } from "./progetto/progetto";
import { AppButton } from "../shared/button/button";
import { PROGETTO_HEADERS } from './progetto/progetto.headers';
import { NewProgettoComponent } from "./new-progetto/new-progetto";
import { v4 as uuidv4 } from 'uuid';
import { RequestsService } from '../shared/requests.service';


@Component({
  selector: 'app-progetti',
  imports: [TableRowComponent, ProgettoComponent, AppButton, NewProgettoComponent],
  templateUrl: './progetti.html',
  styleUrl: './progetti.css',
  
})

export class Progetti {

  Progetti = signal<Progetto[] | undefined>(undefined);
  isFetching = signal(false);
  error = signal('');
  private requestsService = inject(RequestsService);
  private destroyRef = inject(DestroyRef);

  isProgettoInAggiunta = false;

  // dummyProgetti = PROGETTI_DUMMY;

  readonly headersProgetti: Record<keyof Progetto, string> = PROGETTO_HEADERS;  // Record per inserire i titoli (headers) dei dati della tabella Progetti corrispondenti ai parametri del tipo Progetto

  ngOnInit() {
    this.isFetching.set(true);
    const subscription = this.requestsService.caricaProgettiDisponibili()
    .subscribe({
      next: (progetti) => {
        console.log('Progetti caricati:', progetti); // Log per verificare i dati
        this.Progetti.set(progetti);
      },
      error: (error: Error) => {
        this.error.set(error.message);
      },
      complete: () => {
        this.isFetching.set(false);
      }
    });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    })

  }

  columns: Column<Progetto>[] =
    (Object.keys(this.headersProgetti) as (keyof Progetto)[])
      .filter(key => key !== 'id') // Escludi il campo 'id'
      .map(key => ({
        header: this.headersProgetti[key],
        value: p => p[key] as any,
      }));

  get progettiColsCount(): number{
    return this.columns.length;
  }

  onAggiuntaProgetto(){
    this.isProgettoInAggiunta = true;
  }

  aggiungiProgetto(newProgetto: Progetto) {
    const newProgettoWithId = { ...newProgetto, id: this.generateId() }; // Genera un ID univoco
    const progettiCorrenti = this.Progetti();
    this.Progetti.set([...(progettiCorrenti || []), newProgettoWithId]);
    this.isProgettoInAggiunta = false;
  }

  private generateId(): string {
    return uuidv4();
  }

  annullaAggiuntaProgetto(){
    this.isProgettoInAggiunta = false;
  }

}


