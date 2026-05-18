import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { Project } from '../../../../shared/models/project.model';
import { Employee } from '../../../../shared/models/employee.model';
import { COMPLETE_PROJECT_HEADERS } from '../../../projects/project/complete-project.headers';
import { Location } from '@angular/common';
import { EmployeesService } from '../../../../shared/services/employees.service';
import { ProjectsService } from '../../../../shared/services/projects.service';

@Component({
  selector: 'app-employee-projects',
  imports: [CommonModule],
  templateUrl: './employee-projects.component.html',
  styleUrl: './employee-projects.component.scss',
})
export class EmployeeProjectsComponent {

    private employeesService = inject(EmployeesService);
    private projectsService = inject(ProjectsService)
    private destroyRef = inject(DestroyRef);
    private location = inject(Location);

    isFetching = signal(false);
    error = signal('');
    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

    projectsList = this.projectsService.loadedProjects;
    selectedEmployee = input.required<Employee>();

    viewProject = output<Project>();

    readonly projectsHeaders: Partial<Record<keyof Project, string>> = COMPLETE_PROJECT_HEADERS;
    readonly headersArray = Object.entries(this.projectsHeaders)
      .filter(([key]) => key === 'company'
                      || key === 'customer'
                      || key === 'head'
                      || key === 'name'
                      || key === 'projectStatus')
      .map(([key, label]) => ({
        key: key as keyof Project,
        label,
      }));


  filteredProjects = computed<Project[]>(() => {
    const risorsa = this.selectedEmployee();
    
    // Creiamo entrambe le combinazioni per sicurezza
    const nomeCognome = `${risorsa.name} ${risorsa.surname}`.trim().toLowerCase();
    const cognomeNome = `${risorsa.surname} ${risorsa.name}`.trim().toLowerCase();

    return this.projectsList().filter(project => {
      const employees = project.projectEmployees || [];

      return employees.some((projectEmployee: any) => {
        const employeeString = String(projectEmployee.employee || '').toLowerCase();

        // Il match è valido se la stringa del backend combacia con una delle due combinazioni
        const matchName = employeeString === nomeCognome || employeeString === cognomeNome;
        
        return matchName;
      });
    });
  });

    ngOnInit() {

      this.isFetching.set(true);

      const subscription = this.projectsService.loadAvailableProjects()
      .pipe(
        finalize (() => {
          this.isFetching.set(false);
        })
      ).subscribe({
        error: (err) => {
          this.error.set('Errore durante il caricamento dei progetti: ' + err.message);
          this.statusMessage.set({ text: this.error() ?? '', type: 'error' });
        }
      });

      this.destroyRef.onDestroy(() => {
        subscription.unsubscribe();
      });
    }
  
  getValue(p: Project, key: keyof Project): string {
    const progettoValue = p[key];

    // format base (evitando [object Object])
    if (progettoValue == null) return '';
    if (Array.isArray(progettoValue)) return progettoValue.join(', ');
    if (typeof progettoValue === 'object') return JSON.stringify(progettoValue);
    return String(progettoValue);
  }

  indietro() {
      this.location.back();
  }
    
}
