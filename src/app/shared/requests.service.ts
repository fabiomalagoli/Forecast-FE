import { inject, Injectable, signal } from '@angular/core';
import { EMPTY, catchError, map, tap, throwError } from 'rxjs';
import { Progetto } from '../progetti/progetto/progetto.model';
import { ModelloCliente } from '../clienti/cliente/cliente.model';
import { HttpClient } from '@angular/common/http';
import { ErrorService } from './error.service';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class RequestsService {
  private errorService = inject(ErrorService);

  private httpClient = inject(HttpClient);

  private Progetti = signal<Progetto[]>([]);

  progettiCaricati = this.Progetti.asReadonly();

  caricaProgettiDisponibili() {
    return this.fetchProgetti(
      `${environment.apiUrl}/projects`,
      'Qualcosa è andato storto. Riprova più tardi.',
    ).pipe(
      tap({
        next: (progetti) => this.Progetti.set(progetti),
      }),
    );
  }

  aggiungiNuovoProgetto(progetto: Progetto) {
    const progettiPrecedenti = this.Progetti();

    if (!progettiPrecedenti.some((p) => p.id === progetto.id)) {
      this.Progetti.set([...progettiPrecedenti, progetto]);
    }

    return this.httpClient
      .put(`${environment.apiUrl}/projects/{` + progetto.id + '}', {
        progettoId: progetto.id,
      })
      .pipe(
        catchError((error) => {
          this.Progetti.set(progettiPrecedenti);
          this.errorService.showError('Inserimento fallito.');
          return throwError(() => new Error('Inserimento fallito.'));
        }),
      );
  }

  // removeProgetto(progetto: Progetto) {

  //     const progettiPrecedenti = this.Progetti();
  //     if (progettiPrecedenti.length === 0) {
  //     return EMPTY; // Return an EMPTY observable instead of undefined
  //     }

  //     if (progettiPrecedenti.some((p) => p.Id === progetto.Id)) {
  //     this.Progetti.set(progettiPrecedenti.filter((p) => p.Id !== progetto.Id));
  //     }

  //     return this.httpClient.delete("http://localhost:3000/user-places/" + progetto.Id)
  //         .pipe(
  //         catchError(error => {
  //             this.Progetti.set(progettiPrecedenti);
  //             this.errorService.showError('Failed to delete the selected place.');
  //             return throwError(() => new Error('Failed to delete the selected place.'));
  //         })
  //     );

  // } chiedere per quanto riguarda un eventuale richiesta http DELETE per progetti

  private fetchProgetti(url: string, errorMessage: string) {
    return this.httpClient.get<any[]>(url).pipe(
      tap((resData) => {
        console.log('Risposta dal backend:', resData); // Log per verificare la risposta
      }),
      map((projects) =>
        projects.map((project) => ({
          id: project.id,
          activity: project.activity,
          description: project.description,
          status: project.projectStatus || 'N/A', // Mappa lo stato
          customer: project.customer || 'N/A', // Mappa il cliente
          head: project.head,
          company: project.company || 'N/A', // Mappa l'azienda
          pm: project.pm || 'N/A', // Mappa il PM
          totalDays: project.totalDays,
          winProbability: project.winProbability ? project.winProbability * 100 : undefined, // Converti in percentuale
        })),
      ),
      catchError((error) => {
        console.log(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  //GET PER HOME (grid component)

  //getSummary() {
  //  return this.httpClient.get<[]>('https://localhost:5001/api/projects/summary');
  //}
}
