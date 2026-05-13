import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Project } from '../../../projects/project/project.model';
import { COMPLETE_PROJECT_HEADERS } from '../../../projects/project/complete-project.headers';
import { AppButtonComponent } from '../../../shared/button/button';
import { finalize } from 'rxjs';
import { CustomersService } from '../../../shared/services/customers.service';

@Component({
  selector: 'app-customer-projects',
  standalone: true,
  imports: [AppButtonComponent],
  templateUrl: './customer-projects.component.html',
  styleUrls: ['customer-projects.component.css', '../../../shared/progetto-form.css'],
})
export class CustomerProjectsComponent implements OnInit {
  // Leggiamo l’ID dalla route (es. /progetti/:id)
  private route = inject(ActivatedRoute);
  // Usiamo la history del browser per tornare indietro
  private location = inject(Location);
  private customersService = inject(CustomersService);

  loading = signal(true);
  error = signal<string | null>(null);
  projects = signal<Project[]>([]);

  readonly projectsHeaders: Partial<Record<keyof Project, string>> = COMPLETE_PROJECT_HEADERS;
  readonly headersArray = Object.entries(this.projectsHeaders)
    .filter(([key]) => key !== 'id')
    .map(([key, label]) => ({
      key: key as keyof Project,
      label,
    }));

  ngOnInit() {
    console.log("Elenco Progetti del Cliente Inizializzato");
    const id = this.route.snapshot.paramMap.get('id');
    console.log('ID recuperato:', id);

    if (!id) {
      this.error.set('ID cliente mancante.');
      this.loading.set(false);
      return;
    }

    this.customersService.loadActiveProjectsForCustomer(id).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (p) => {
        console.log('Progetti caricati:', p);
        this.projects.set(p);
      },
      error: (err) => {
        console.error('Errore API:', err);
        this.error.set('Errore nel caricamento dei progetti.');
      },
    });
  }

  getValue(p: Project, key: keyof Project): string {
    const projectValue = p[key];

    // format base (evita [object Object])
    if (projectValue == null) return '';
    if (Array.isArray(projectValue)) return projectValue.join(', ');
    if (typeof projectValue === 'object') return JSON.stringify(projectValue);
    return String(projectValue);
  }

  indietro() {
    this.location.back();
  }
}
