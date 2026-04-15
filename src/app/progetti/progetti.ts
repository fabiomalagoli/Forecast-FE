import { Component, DestroyRef, inject, signal } from '@angular/core';
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


@Component({
  selector: 'app-progetti',
  imports: [TableRowComponent, ProgettoComponent, AppButton, NewProgettoComponent, ModificaComponent],
  templateUrl: './progetti.html',
  styleUrl: './progetti.css',
  
})

export class Progetti {

  isFetching = signal(false);
  error = signal('');
  private requestsService = inject(RequestsService);
  private destroyRef = inject(DestroyRef);
  statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);
  progetti = this.requestsService.progettiCaricati;

  isProgettoInAggiunta = false;

  progettoInModifica = signal<Progetto | null>(null);

  // dummyProgetti = PROGETTI_DUMMY;

  readonly headersProgetti: Partial<Record<keyof Progetto, string>> = PROGETTO_COMPLETO_HEADERS;  // Record per inserire i titoli (headers) dei dati della tabella Progetti corrispondenti ai parametri del tipo Progetto

  // Router per spostarci tra pagine/viste dei progetti
  constructor(private router: Router) {
    // Questo log scatterà ogni singola volta che il segnale del service cambia
    effect(() => {
      console.log('IL SEGNALE È CAMBIATO! Nuova lista:', this.progetti());
    });
  }

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
    this.isProgettoInAggiunta = true;
  }

  aggiungiProgetto(newProgetto: Progetto) {
    this.isProgettoInAggiunta = false;
    this.showNotification('Progetto creato con successo!', 'success');
  }

  annullaAggiuntaProgetto(){
    this.isProgettoInAggiunta = false;
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
    // La logica di aggiornamento è già gestita dentro il componente Modifica tramite il Service, qui dobbiamo solo chiudere il pannello.
    this.chiudiModifica();
    this.showNotification('Modifiche salvate correttamente!', 'success');
    this.progettoInModifica.set(null);
  }

  showNotification(text: string, type: 'success' | 'error') {
    this.statusMessage.set({ text, type });
    setTimeout(() => this.statusMessage.set(null), 3000);
  }

  apriPaginaVisualizza(id: string){
    this.router.navigate(['/progetti', id]);
  }

}