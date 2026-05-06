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

@Component({
  selector: 'app-role-resources',
  templateUrl: './role-resources.html',
  styleUrls: ['./role-resources.css'],
  imports: [ModificaRisorsaPerRuoloComponent, CommonModule, AppButtonComponent],
})
export class RoleResourcesComponent {

    isFetching = signal(false);
    error = signal('');
    private requestsService = inject(RequestsService);
    private destroyRef = inject(DestroyRef);
    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

    risorseAssociate = input<any[]>([]);

    risorsaInModifica = signal<Employee | null>(null);

    constructor(private router: Router) {
        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Nuova lista:', this.risorseAssociate());
        });
        
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

}
