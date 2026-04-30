import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Role } from './role.model';
import { RequestsService } from '../shared/requests.service';
import { Router } from '@angular/router';
import { RoleResourcesComponent } from './role-resources/role-resources';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.html',
  styleUrls: ['./roles.css'],
  imports: [RoleResourcesComponent],
})
export class RolesComponent {
    isFetching = signal(false);
    error = signal('');
    private requestsService = inject(RequestsService);
    private destroyRef = inject(DestroyRef);
    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);
    roles = this.requestsService.jobRolesCaricati;

    listaRisorse = signal<any[]>([]);

    isRoleInAggiunta = signal<boolean | null>(null);

    roleInModifica = signal<Role | null>(null);

    selectedRoleId = signal<string | null>(null);
    risorseFiltrateSelezionate = signal<any[]>([]);

    constructor(private router: Router) {
        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Nuova lista:', this.roles());
        });
    }

    ngOnInit() {
        this.isFetching.set(true);
        const subscription = this.requestsService.caricaJobRolesDisponibili().subscribe({
            next: (data) => {
                this.isFetching.set(false);
                this.statusMessage.set({text: 'Ruoli caricati con successo!', type: 'success'});
            },
            error: (err) => {
                this.isFetching.set(false);
                this.error.set('Errore durante il caricamento dei ruoli: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il caricamento dei ruoli', type: 'error'});
            },
            complete: () => {
                this.isFetching.set(false);
            },
        });

        this.destroyRef.onDestroy(() => {
            subscription.unsubscribe();
        });

        const risorseSubscription = this.requestsService.caricaEmployeesDisponibili().subscribe({
            next: (data) => {
                this.statusMessage.set({text: 'Risorse caricate con successo!', type: 'success'});
            },
            error: (err) => {
                this.error.set('Errore durante il caricamento delle risorse: ' + err.message);
                this.statusMessage.set({text: 'Errore durante il caricamento delle risorse', type: 'error'});
            },
        });

        this.destroyRef.onDestroy(() => {
            risorseSubscription.unsubscribe();
        });


    }

    aggiornaRuoli(){
        this.isFetching.set(true);
        const timeoutId = setTimeout(() => {
        const subscription = this.requestsService.caricaJobRolesDisponibili()
            .subscribe({ 
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

mostraRisorsePerRuolo(ruolo: any) {
    this.selectedRoleId.set(ruolo.id);
    
    const tutteLeRisorse = this.requestsService.employeesCaricati();
    
    console.log('Ruolo cliccato:', ruolo);
    console.log('Prima risorsa dell array (per capire la struttura):', tutteLeRisorse[0]);
    
    const risorseFiltrate = tutteLeRisorse.filter(risorsa => {
        return risorsa.jobRole === ruolo.id || 
            risorsa.jobRole === ruolo.name;
    });
    
    console.log('Risorse trovate dal filtro:', risorseFiltrate);
    
    this.risorseFiltrateSelezionate.set(risorseFiltrate);
    
    if(risorseFiltrate.length === 0) {
        this.statusMessage.set({text: 'Nessuna risorsa trovata per questo ruolo', type: 'error'});
    }
}

    chiudiPannello() {
        this.selectedRoleId.set(null);
        this.risorseFiltrateSelezionate.set([]);
    }

}