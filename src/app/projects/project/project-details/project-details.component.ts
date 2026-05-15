import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Project } from '../../../shared/models/project.model';
import { COMPLETE_PROJECT_HEADERS } from '../complete-project.headers';
import { AppButtonComponent } from '../../../shared/button/button';
import { ResourceDetailsGridComponent } from './employees-details-grid/employee-details-grid.component';
import { ProjectEmployee } from '../../../shared/models/project-employee.model';
import { finalize } from 'rxjs';
import { ProjectsService } from '../../../shared/services/projects.service';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [AppButtonComponent, ResourceDetailsGridComponent],
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.css', '../../../shared/progetto-form.css'],
})
export class ProjectDetailsComponent {
  // Leggiamo l’ID dalla route (es. /progetti/:id)
  private route = inject(ActivatedRoute);
  // Usiamo la history del browser per tornare indietro
  private location = inject(Location);
  private projectsService = inject(ProjectsService);

  loading = signal(true);
  error = signal<string | null>(null);
  project = signal<Project | null>(null);
  selectedResource = signal<ProjectEmployee | null>(null);

  readonly projectsHeaders: Partial<Record<keyof Project, string>> = COMPLETE_PROJECT_HEADERS;
  readonly headersArray = Object.entries(this.projectsHeaders)
    .filter(([key]) => key !== 'id')
    .map(([key, label]) => ({
      key: key as keyof Project,
      label,
    }));

  ngOnInit() {
    console.log("Componente Visualizza Inizializzato");
    const id = this.route.snapshot.paramMap.get('id');
    console.log('ID recuperato:', id);

    if (!id) {
      this.error.set('ID progetto mancante.');
      this.loading.set(false);
      return;
    }

    this.projectsService.loadProjectById(id).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (p) => {
        console.log('Progetto caricato:', p);
        this.project.set(p);
      },
      error: (err) => {
        console.error('Errore API:', err);
        this.error.set('Errore nel caricamento del progetto.');
      },
    });
  }

  openEmployeeDetails(employee: ProjectEmployee) {
    this.selectedResource.set(employee);
  }

  getValue(p: Project, key: keyof Project): string {
    const progettoValue = p[key];

    // format base (evitando [object Object])
    if (progettoValue == null) return '';
    if (Array.isArray(progettoValue)) return progettoValue.join(', ');
    if (typeof progettoValue === 'object') return JSON.stringify(progettoValue);
    return String(progettoValue);
  }

  manageSaving(progettoAggiornato: Project) {
    console.log("Ricevuto progetto aggiornato dall'output:", progettoAggiornato);
    this.project.set(progettoAggiornato);
  }

  indietro() {
    this.location.back();
  }
}
