import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RequestsService } from '../../shared/requests.service';
import { Role } from '../role.model';
import { Employee } from '../../risorse/risorse.model';

@Component({
  selector: 'app-role-resources',
  templateUrl: './role-resources.html',
  styleUrls: ['./role-resources.css']
})
export class RoleResourcesComponent {

    isFetching = signal(false);
    error = signal('');
    private requestsService = inject(RequestsService);
    private destroyRef = inject(DestroyRef);
    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

    risorseAssociate = input<any[]>([]);

    constructor(private router: Router) {
        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Nuova lista:', this.risorseAssociate());
        });
        
    }


}
