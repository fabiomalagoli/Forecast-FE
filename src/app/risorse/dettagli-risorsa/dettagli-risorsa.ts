import { Component, DestroyRef, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee } from '../risorse.model';
import { RequestsService } from '../../shared/requests.service';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ProgettiAssociatiRisorsaComponent } from "./progetti-associati-risorsa/progetti-associati-risorsa";
import { Location } from '@angular/common';
import { AppButtonComponent } from '../../shared/button/button';
import { Progetto } from '../../progetti/progetto/progetto.model';

@Component({
  selector: 'app-dettagli-risorsa',
  imports: [CommonModule, AppButtonComponent, ProgettiAssociatiRisorsaComponent],
  templateUrl: './dettagli-risorsa.html',
  styleUrl: './dettagli-risorsa.css'
})
export class DettagliRisorsaComponent {

    private requestsService = inject(RequestsService);
    private destroyRef = inject(DestroyRef);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private location = inject(Location);
    
    risorsaSelezionata = signal<Employee | null>(null);
    progettoSelezionato = signal<Progetto | null>(null);
    isFetching = signal(false);
    error = signal('');

    constructor() {
        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Risorsa Selezionata: ', this.risorsaSelezionata());
        });
    }

    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');

        if (!id) {
            this.error.set('ID risorsa mancante.');
            this.statusMessage.set({ text: this.error(), type: 'error' });
            return;
        }

        this.isFetching.set(true);

        const subscription = this.requestsService.caricaEmployeeById(id)
        .pipe(
            finalize(() => {
                this.isFetching.set(false);
            })
        ).subscribe({
            next: (employee) => {
                this.risorsaSelezionata.set(employee);
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento della risorsa: ' + err.message);
                this.statusMessage.set({ text: this.error(), type: 'error' });
            }
        });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });
    }

    indietro() {
        this.location.back();
    }

    apriProgettoRisorsa(p: Progetto) {
        this.progettoSelezionato.set(p);
        this.router.navigate(['/progetti', p.id]);
    }
}
