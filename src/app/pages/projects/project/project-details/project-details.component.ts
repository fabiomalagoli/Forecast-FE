import { Component, inject, signal, computed, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Project, RecapData } from '../../../../shared/models/project.model';
import { COMPLETE_PROJECT_HEADERS } from '../complete-project.headers';
import { AppButtonComponent } from '../../../../shared/button/button';
import { ResourceDetailsGridComponent } from './employees-details-grid/employee-details-grid.component';
import { ProjectEmployee } from '../../../../shared/models/project.model';
import { finalize, forkJoin } from 'rxjs';
import { ProjectsService } from '../../../../shared/services/projects.service';
import { EmployeesService } from '../../../../shared/services/employees.service';
import { RolesService } from '../../../../shared/services/roles.service';
import { mergeProjectEmployeesWithEmployeeDetails } from '../../../../shared/utils/project-display.utils';
import { TextInputComponent } from "../../../../shared/text-input/text-input.component";
import { RECAP_DATA_HEADERS } from '../../recap-data.headers';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [AppButtonComponent, ResourceDetailsGridComponent, TextInputComponent],
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.scss'],
})
export class ProjectDetailsComponent {
  // Leggiamo l’ID dalla route (es. /progetti/:id)
  private route = inject(ActivatedRoute);
  // Usiamo la history del browser per tornare indietro
  private location = inject(Location);
  private projectsService = inject(ProjectsService);
  private employeesService = inject(EmployeesService);
  private rolesService = inject(RolesService);

  loading = signal(true);
  error = signal<string | null>(null);
  project = signal<Project | null>(null);
  projectRecapData = signal<RecapData | null>(null);
  selectedResource = signal<ProjectEmployee | null>(null);
  // Vista con unione fra projectEmployees e la cache degli employees allo stato attuale
  displayedProjectEmployees = signal<ProjectEmployee[]>([]);
  // Mostra o nascondi il banner segnalante il warning di un employee unassigned
  showUnassignedWarning = signal(true);
  // Numero di unassigned employees nella view del Progetto
  unassignedCount = computed(() => this.displayedProjectEmployees().filter(e => (e.jobRole || '').toString().toLowerCase() === 'unassigned').length);

  formattedTotalRevenues = computed(() => {
    const value = this.projectRecapData()?.totalRevenues ?? 0;
    return parseFloat((value as number).toFixed(2));
  });

  formattedBudgetWin = computed(() => {
    const value = this.projectRecapData()?.budgetWin ?? 0;
    return parseFloat((value as number).toFixed(2));
  });

  recapDataHeaders = RECAP_DATA_HEADERS;

  readonly projectsHeaders: Partial<Record<keyof Project, string>> = COMPLETE_PROJECT_HEADERS;
  readonly headersArray = Object.entries(this.projectsHeaders)
    .filter(([key]) => key !== 'id')
    .map(([key, label]) => ({
      key: key as keyof Project,
      label,
    }));

  constructor() {
    effect(() => {
      const _ = this.selectedResource();
      if(_ === null && this.project()?.id) {
        this.projectsService.loadProjectRecapData(this.project()?.id ?? '').subscribe({
          next: (data) => {
            this.projectRecapData.set(data);
          }
        });
      }
    });
  }

  ngOnInit() {
    console.log("Componente Visualizza Inizializzato");
    const id = this.route.snapshot.paramMap.get('id');
    console.log('ID recuperato:', id);

    if (!id) {
      this.error.set('ID progetto mancante.');
      this.loading.set(false);
      return;
    }

    forkJoin({
      project: this.projectsService.loadProjectById(id),
      employees: this.employeesService.loadAllEmployees(),
      roles: this.rolesService.loadAllJobRoles(),
      recapData: this.projectsService.loadProjectRecapData(id)
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ project: p, recapData: r }) => {
        console.log('Progetto caricato dal backend:', p);
        this.project.set(p);
        this.projectRecapData.set(r);
        this.updateDisplayedEmployees();
        console.log('Risorse progetto visualizzate:', this.displayedProjectEmployees());
      },
      error: (err) => {
        console.error('Errore API:', err);
        this.error.set('Errore nel caricamento del progetto.');
      },
    });
  }

  updateDisplayedEmployees() {
    const p = this.project();
    if (!p) {
      this.displayedProjectEmployees.set([]);
      return;
    }

    const allEmps = this.employeesService.loadedAllEmployees() || [];
    const allRoles = this.rolesService.loadedAllJobRoles?.() || [];

    this.displayedProjectEmployees.set(
      mergeProjectEmployeesWithEmployeeDetails(p.projectEmployees || [], allEmps, allRoles),
    );
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

  onClosingDrawer() {
    this.projectsService.loadProjectRecapData(this.project()?.id ?? '').subscribe({
      next: (data) => {
        this.projectRecapData.set(data);
      }
    })
  }

  indietro() {
    this.location.back();
  }

  private setupDisplayedEmployeesEffect() {
    effect(() => {
      const _ = this.employeesService.loadedAllEmployees();
      const _roles = this.rolesService.loadedAllJobRoles();
      const _p = this.project();
      if (_p) this.updateDisplayedEmployees();
    });
  }
}
