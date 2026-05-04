import { Component, DestroyRef, effect, inject, signal, OnInit } from '@angular/core';
import { RequestsService } from '../shared/requests.service';
import { Router } from '@angular/router';
import { Employee } from './risorse.model';
import { CommonModule } from '@angular/common';
import { AppButton } from '../shared/button/button';
import { ModificaRisorsaComponent } from './modifica/modifica';

@Component({
  selector: 'app-risorse',
  templateUrl: './risorse.html',
  styleUrls: ['./risorse.css'],
  imports: [CommonModule, AppButton, ModificaRisorsaComponent],
  standalone: true 
})
export class RisorseComponent implements OnInit {
    isFetching = signal(false);
    error = signal('');
    private requestsService = inject(RequestsService);
    private destroyRef = inject(DestroyRef);
    private router = inject(Router);

    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);
    
    risorse = signal<Employee[]>([]);

    isRisorsaInAggiunta = signal<boolean | null>(null);
    risorsaInModifica = signal<Employee | null>(null); 

    selectedRisorsaId = signal<string | null>(null);
    selectedRisorsa = signal<Employee | null>(null);

    constructor() {
        // Effetto per monitorare i cambiamenti della lista risorse
        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Nuova lista risorse:', this.risorse());
        });
    }

    ngOnInit() {
        this.isFetching.set(true);
        
        // Caricamento principale delle risorse
        const subscription = this.requestsService.caricaEmployeesDisponibili().subscribe({
            next: (data) => {
                console.log('Risposta dal backend (risorse):', data);
                this.statusMessage.set({text: 'Risorse caricate con successo!', type: 'success'});
                this.risorse.set(data);
            },
            error: (err) => {
                this.isFetching.set(false);
                this.error.set('Errore durante il caricamento delle risorse: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il caricamento delle risorse', type: 'error'});
            },
            complete: () => {
                this.isFetching.set(false);
            },
        });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });
    }

    ricaricaRisorse() {
        this.isFetching.set(true);
        const subscription = this.requestsService.caricaEmployeesDisponibili().subscribe({
            next: (data) => {
                console.log('Risorse ricaricate:', data);
                this.risorse.set(data);
            },
            error: (err) => {
                this.isFetching.set(false);
                this.error.set('Errore durante il ricaricamento delle risorse: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il ricaricamento delle risorse', type: 'error'});
            },
            complete: () => {
                this.isFetching.set(false);
            },
        });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });
    }

    aggiornaRisorse(){
        this.isFetching.set(true);
        const timeoutId = setTimeout(() => {
            const subscription = this.requestsService.caricaEmployeesDisponibili()
            .subscribe({
                next: (data) => {
                    this.isFetching.set(false);
                    this.statusMessage.set({text: 'Risorse aggiornate con successo!', type: 'success'});
                },
                error: (err) => {
                    this.isFetching.set(false);
                    this.error.set('Errore durante l\'aggiornamento delle risorse: ' + err.message);
                    this.statusMessage.set({text: 'Errore durante l\'aggiornamento delle risorse', type: 'error'});
                },
                complete: () => {
                    this.isFetching.set(false);
                },
            });

            this.destroyRef.onDestroy(() => {
                subscription.unsubscribe();
            });

        }, 3000); // Simula un ritardo di 3 secondi

        this.destroyRef.onDestroy(() => {
            clearTimeout(timeoutId);
        });
    }

    onAggiuntaRisorsa() {
        this.isRisorsaInAggiunta.set(true);
    }

    annullaAggiuntaRisorsa() {
        this.isRisorsaInAggiunta.set(false);
    }

    aggiungiRisorsa(newRisorsa: Employee) {
        this.ricaricaRisorse(); // Ricarica le risorse dopo l'aggiunta
        this.isRisorsaInAggiunta.set(false);
        this.showNotification('Risorsa aggiunta con successo!', 'success');
    }

    apriModifica(r: Employee) {
        this.risorsaInModifica.set(r);
    }

    chiudiModifica() {
        this.risorsaInModifica.set(null);
    }

    showNotification(text: string, type: 'success' | 'error') {
        this.statusMessage.set({ text, type });
        setTimeout(() => this.statusMessage.set(null), 3000);
    }

    salvaModifica(risorsaAggiornata: Employee) {
        this.ricaricaRisorse(); // Ricarica le risorse dopo la modifica
        this.risorsaInModifica.set(null);
        this.showNotification('Risorsa aggiornata con successo!', 'success');
    }

    // Aggiungi qui eventuali metodi per gestire l'aggiunta, modifica, cancellazione delle risorse
}