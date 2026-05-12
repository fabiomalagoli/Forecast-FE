import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Project } from '../../../projects/project/project.model';
import { RequestsService } from '../../../shared/requests.service';
import { PROGETTO_COMPLETO_HEADERS } from '../../../projects/project/full-project.headers';
import { AppButtonComponent } from '../../../shared/button/button';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-visualizza',
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
  private requests = inject(RequestsService);

  loading = signal(true);
  error = signal<string | null>(null);
  progetti = signal<Project[]>([]);

  readonly headersProgetti: Partial<Record<keyof Project, string>> = PROGETTO_COMPLETO_HEADERS;
  readonly headersArray = Object.entries(this.headersProgetti)
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

    this.requests.caricaProgettiAttiviCliente(id).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (p) => {
        console.log('Progetti caricati:', p);
        this.progetti.set(p);
      },
      error: (err) => {
        console.error('Errore API:', err);
        this.error.set('Errore nel caricamento dei progetti.');
      },
    });
  }

  getValue(p: Project, key: keyof Project): string {
    const progettoValue = p[key];

    // format base (evita [object Object])
    if (progettoValue == null) return '';
    if (Array.isArray(progettoValue)) return progettoValue.join(', ');
    if (typeof progettoValue === 'object') return JSON.stringify(progettoValue);
    return String(progettoValue);
  }

  indietro() {
    this.location.back();
  }
}
