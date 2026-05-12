import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Project } from '../project.model';
import { RequestsService } from '../../../shared/requests.service';
import { PROGETTO_COMPLETO_HEADERS } from '../full-project.headers';
import { AppButtonComponent } from '../../../shared/button/button';
import { ProjectsComponent } from '../../projects.component';
import { ResourceDetailsGridComponent } from './employees-details-grid/employee-details-grid.component';
import { ProjectEmployee } from '../project-employee.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-visualizza',
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
  private requests = inject(RequestsService);

  loading = signal(true);
  error = signal<string | null>(null);
  progetto = signal<Project | null>(null);
  selectedResource = signal<ProjectEmployee | null>(null);

  readonly headersProgetti: Partial<Record<keyof Project, string>> = PROGETTO_COMPLETO_HEADERS;
  readonly headersArray = Object.entries(this.headersProgetti)
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

    this.requests.caricaProgettoById(id).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (p) => {
        console.log('Progetto caricato:', p);
        this.progetto.set(p);
      },
      error: (err) => {
        console.error('Errore API:', err);
        this.error.set('Errore nel caricamento del progetto.');
      },
    });
  }

  apriDettagliRisorsa(employee: ProjectEmployee) {
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

  gestisciSalvataggio(progettoAggiornato: Project) {
    console.log("Ricevuto progetto aggiornato dall'output:", progettoAggiornato);
    this.progetto.set(progettoAggiornato);
  }

  indietro() {
    this.location.back();
  }
}
