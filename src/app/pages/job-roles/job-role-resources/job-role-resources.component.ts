import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JobRole } from '../../../shared/models/job-role.model';
import { Employee } from '../../../shared/models/employee.model';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../../shared/button/button';
import { finalize, timer } from 'rxjs';
import { Location } from '@angular/common';
import { EmployeesService } from '../../../shared/services/employees.service';
import { JobRolesService } from '../../../shared/services/job-roles.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-role-resources',
  templateUrl: './job-role-resources.component.html',
  styleUrls: ['./job-role-resources.component.scss'],
  imports: [CommonModule, AppButtonComponent],
})
export class JobRoleResourcesComponent {

    private employeesService = inject(EmployeesService);
    private rolesService = inject(JobRolesService);
    private destroyRef = inject(DestroyRef);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private location = inject(Location);

    viewEmployeeDetails = output<any>()
    
    isFetching = signal(false);
    error = signal('');

    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

    risorseAssociate = input<any[]>([]);
    ruoloSelezionato = input<JobRole | null>(null);

    editEmployee = output<Employee>();

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
        this.editEmployee.emit(risorsa);
    }

    showNotification(text: string, type: 'success' | 'error') {
        this.statusMessage.set({ text, type });
        timer(3000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.statusMessage.set(null);
        });
    }

    apriOverlayRisorsa(r: Employee){
        this.viewEmployeeDetails.emit(r);
    }

    apriDettagliRisorsa(r: Employee) {
        this.risorsaPerDettaglio.set(r);
        this.rolesService.setLastSelectedRole(this.ruoloSelezionato());
        this.router.navigate(['/risorse', r.id]);
    }

}
