import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Role } from './role.model';
import { RequestsService } from '../shared/requests.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.html',
  styleUrls: ['./roles.css']
})
export class RolesComponent {
    isFetching = signal(false);
    error = signal('');
    private requestsService = inject(RequestsService);
    private destroyRef = inject(DestroyRef);
    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);
    roles = this.requestsService.jobRolesCaricati;

    isRoleInAggiunta = signal<boolean | null>(null);

    roleInModifica = signal<Role | null>(null);

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
    }

}