import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Role } from '../../../shared/models/role.model';
import { Employee } from '../../../shared/models/employee.model';
import { EditEmployeeForRoleComponent } from './edit-employee-for-role/edit-employee-for-role.component';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../../shared/button/button';
import { finalize } from 'rxjs';
import { Location } from '@angular/common';
import { EmployeesService } from '../../../shared/services/employees.service';
import { RolesService } from '../../../shared/services/roles.service';

@Component({
  selector: 'app-role-resources',
  templateUrl: './role-resources.component.html',
  styleUrls: ['./role-resources.component.scss'],
  imports: [EditEmployeeForRoleComponent, CommonModule, AppButtonComponent],
})
export class RoleResourcesComponent {

    private employeesService = inject(EmployeesService);
    private rolesService = inject(RolesService);
    private destroyRef = inject(DestroyRef);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private location = inject(Location);
    
    isFetching = signal(false);
    error = signal('');

    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

    risorseAssociate = input<any[]>([]);
    ruoloSelezionato = input<Role | null>(null);

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

        const subscription = this.employeesService.loadEmployeeById(id)
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

    reloadEmployeesforRoleSelected() {
        this.isFetching.set(true);
        const subscription = this.employeesService.loadAllEmployees().pipe(
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

    OpenEmployeeEditing(risorsa: Employee) {
        this.risorsaInModifica.set(risorsa); // Fa apparire l' @if nel template
    }

    closeEmployeeEditing() {
        this.risorsaInModifica.set(null); // Nasconde l' @if nel template
    }

    saveEdits() {
        this.reloadEmployeesforRoleSelected();
        this.closeEmployeeEditing();
        this.showNotification('Modifiche salvate correttamente!', 'success');
    }

    showNotification(text: string, type: 'success' | 'error') {
        this.statusMessage.set({ text, type });
        setTimeout(() => this.statusMessage.set(null), 3000);
    }

    apriDettagliRisorsa(r: Employee) {
        this.risorsaPerDettaglio.set(r);
        this.rolesService.setLastSelectedRole(this.ruoloSelezionato());
        this.router.navigate(['/risorse', r.id]);
    }

}
