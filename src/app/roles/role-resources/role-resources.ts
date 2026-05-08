import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RequestsService } from '../../shared/requests.service';
import { Role } from '../role.model';
import { Employee } from '../../risorse/risorse.model';
import { ModificaRisorsaPerRuoloComponent } from '../role-resources/modifica/modifica';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../shared/button/button';
import { NewRisorsaComponent } from '../../risorse/new-risorsa/new-risorsa';
import { finalize } from 'rxjs';
import { Location } from '@angular/common';

@Component({
  selector: 'app-role-resources',
  templateUrl: './role-resources.html',
  styleUrls: ['./role-resources.css'],
  imports: [ModificaRisorsaPerRuoloComponent, CommonModule, AppButtonComponent],
})
export class RoleResourcesComponent {

    private requestsService = inject(RequestsService);
    private destroyRef = inject(DestroyRef);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private location = inject(Location);
    
    isFetching = signal(false);
    error = signal('');

    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

    risorseAssociate = input<any[]>([]);
    ruoloSelezionato = input<Role| null>(null);

    risorsaInModifica = signal<Employee | null>(null);

    risorsaPerDettaglio = signal<Employee | null>(null);

    constructor() {
        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Nuova lista:', this.risorseAssociate());
        });
        
    }

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
                this.risorsaPerDettaglio.set(employee);
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

    aggiornaRisorsePerRuolo() {
        this.isFetching.set(true);
        const subscription = this.requestsService.caricaEmployeesDisponibili().pipe(
            finalize(() => this.isFetching.set(false))
        ).subscribe({
            next: () => {
                this.risorsaInModifica.set(null);
                this.statusMessage.set({text: 'Risorsa modificata con successo!', type: 'success'});
            },
            error: (err) => {
                this.error.set('Errore durante il ricaricamento delle risorse: ' + err.message);
                this.statusMessage.set({text: 'Risorsa modificata ma errore nel ricaricamento', type: 'error'});
            }
        });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });
    }

    apriModificaRisorsa(risorsa: Employee) {
        this.risorsaInModifica.set(risorsa); // Fa apparire l' @if nel template
    }

    chiudiModificaRisorsa() {
        this.risorsaInModifica.set(null); // Nasconde l' @if nel template
    }

    apriDettagliRisorsa(r: Employee) {
        this.risorsaPerDettaglio.set(r);
        this.requestsService.setUltimoRuoloSelezionato(this.ruoloSelezionato());
        this.router.navigate(['/risorse', r.id]);
    }

}
