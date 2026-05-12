import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestsService } from '../../../shared/requests.service';
import { finalize } from 'rxjs';
import { Project } from '../../../projects/project/project.model';
import { Employee } from '../../employee.model';
import { PROGETTO_COMPLETO_HEADERS } from '../../../projects/project/full-project.headers';
import { AppButtonComponent } from '../../../shared/button/button';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-progetti-associati-risorsa',
  imports: [CommonModule],
  templateUrl: './employee-projects.component.html',
  styleUrl: './employee-projects.component.css',
})
export class EmployeeProjectsComponent {

    private requestsService = inject(RequestsService);
    private destroyRef = inject(DestroyRef);
    private location = inject(Location);

    isFetching = signal(false);
    error = signal('');
    statusMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

    listaProgetti = this.requestsService.progettiCaricati;
    risorsaSelezionata = input.required<Employee>();

    viewProgetto = output<Project>();

    readonly headersProgetti: Partial<Record<keyof Project, string>> = PROGETTO_COMPLETO_HEADERS;
    readonly headersArray = Object.entries(this.headersProgetti)
      .filter(([key]) => key === 'company'
                      || key === 'customer'
                      || key === 'head'
                      || key === 'name'
                      || key === 'projectStatus')
      .map(([key, label]) => ({
        key: key as keyof Project,
        label,
      }));


  ProgettiFiltrati = computed<Project[]>(() => {
    const risorsa = this.risorsaSelezionata();
    
    // Creiamo entrambe le combinazioni per sicurezza
    const nomeCognome = `${risorsa.name} ${risorsa.surname}`.trim().toLowerCase();
    const cognomeNome = `${risorsa.surname} ${risorsa.name}`.trim().toLowerCase();

    return this.listaProgetti().filter(project => {
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

      const subscription = this.requestsService.caricaProgettiDisponibili()
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
