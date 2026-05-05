import { Component, DestroyRef, effect, inject, signal, OnInit } from '@angular/core';
import { RequestsService } from '../shared/requests.service';
import { Router } from '@angular/router';
import { Employee } from './risorse.model';
import { CommonModule } from '@angular/common';
import { AppButton } from '../shared/button/button';
import { ModificaRisorsaComponent } from './modifica/modifica';
import { NewRisorsa } from './new-risorsa/new-risorsa';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RisorsaRowComponent } from './risorsa/risorsa';

@Component({
  selector: 'app-risorse',
  templateUrl: './risorse.html',
  styleUrls: ['./risorse.css'],
  imports: [CommonModule, AppButton, ModificaRisorsaComponent, NewRisorsa, RisorsaRowComponent, MatPaginatorModule],
  standalone: true 
})
export class RisorseComponent implements OnInit {
    isFetching = signal(false);
    error = signal('');
    private requestsService = inject(RequestsService);
    private destroyRef = inject(DestroyRef);
    private router = inject(Router);

    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);
    
    risorse = this.requestsService.employeesCaricati;

    isRisorsaInAggiunta = signal<boolean | null>(null);
    risorsaInModifica = signal<Employee | null>(null); 
    risorsaInAggiunta = signal<Employee | null>(null);

    selectedRisorsaId = signal<string | null>(null);
    selectedRisorsa = signal<Employee | null>(null);

    currentPage = signal(1) //Pagina iniziale di default. Resa un signal per reagire ai cambiamenti
    pageSize = 10;
    pagination = this.requestsService.employeesPagination;

    constructor() {
        // Effetto per monitorare i cambiamenti della lista risorse
        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Nuova lista risorse:', this.risorse());
        });
    }

    onPageChange(event: PageEvent){
        const nextPage = event.pageIndex + 1;
        const nextPageSize = event.pageSize;

        this.pageSize = nextPageSize;
        this.caricaPagina(nextPage);
    }

    caricaPagina(page: number){
        this.isFetching.set(true);
        this.currentPage.set(page);
        this.chiudiPannello();

        this.requestsService.caricaEmployeesDisponibili(page, this.pageSize).subscribe({
            next: () => {
                const meta = this.pagination();
                if(meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
                this.statusMessage.set({text: 'Risorse caricate con successo!', type: 'success'});
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento delle risorse: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il caricamento delle risorse', type: 'error'});
            },
            complete: () => {
                this.isFetching.set(false);
            },
        });
    }

    nextPage() {
        const meta = this.pagination();
        if(meta?.hasNext){
            this.caricaPagina(meta.currentPage + 1);
        }
    }

    prevPage() {
        const meta = this.pagination();
        if (meta?.hasPrevious) {
            this.caricaPagina(meta.currentPage - 1);
        }
    }

    ngOnInit() {
        this.isFetching.set(true);
        
        // Caricamento principale delle risorse
        const subscription = this.requestsService.caricaEmployeesDisponibili(this.currentPage(), this.pageSize).subscribe({
            next: (data) => {
                const meta = this.pagination();
                if (meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
                this.isFetching.set(false);
                this.statusMessage.set({text: 'Risorse caricate con successo!', type: 'success'});
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
                const meta = this.pagination();
                if (meta) {
                    this.currentPage.set(meta.currentPage);
                    this.pageSize = meta.pageSize;
                }
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
        this.isRisorsaInAggiunta.set(false);
        this.statusMessage.set({text: 'Risorsa aggiunta con successo!', type: 'success'});
        this.currentPage.set(1); // torna alla pagina iniziale
        this.caricaPagina(1); // carica pagina iniziale
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

    salvaModifica() {
        this.ricaricaRisorse(); // Ricarica le risorse dopo la modifica
        this.risorsaInModifica.set(null);
        this.showNotification('Risorsa aggiornata con successo!', 'success');
    }

    chiudiPannello() {
        this.selectedRisorsaId.set(null);
        this.selectedRisorsa.set(null);
        // this.risorseFiltrateSelezionate.set([]);
    }

}
