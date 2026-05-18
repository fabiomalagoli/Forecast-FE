import { Component, DestroyRef, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee } from '../../../shared/models/employee.model';
import { EmployeesService } from '../../../shared/services/employees.service';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { EmployeeProjectsComponent } from "./employee-projects/employee-projects.component";
import { Location } from '@angular/common';
import { AppButtonComponent } from '../../../shared/button/button';
import { Project } from '../../../shared/models/project.model';

@Component({
  selector: 'app-employee-details',
  imports: [CommonModule, AppButtonComponent, EmployeeProjectsComponent],
  templateUrl: './employee-details.component.html',
  styleUrl: './employee-details.component.scss'
})
export class EmployeeDetailsComponent {

    private employeesService = inject(EmployeesService);
    private destroyRef = inject(DestroyRef);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private location = inject(Location);
    
    selectedEmployee = signal<Employee | null>(null);
    selectedProject = signal<Project | null>(null);
    isFetching = signal(false);
    error = signal('');

    constructor() {
        effect(() => {
            console.log('IL SEGNALE È CAMBIATO! Risorsa Selezionata: ', this.selectedEmployee());
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

        const subscription = this.employeesService.loadEmployeeById(id)
        .pipe(
            finalize(() => {
                this.isFetching.set(false);
            })
        ).subscribe({
            next: (employee) => {
                this.selectedEmployee.set(employee);
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

    openEmployeeProject(p: Project) {
        this.selectedProject.set(p);
        this.router.navigate(['/progetti', p.id]);
    }
}
