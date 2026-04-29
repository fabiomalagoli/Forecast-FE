import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Progetto } from '../progetto.model';
import { RequestsService } from '../../../shared/requests.service';
import { PROGETTO_COMPLETO_HEADERS } from '../progetto-completo.headers';
import { AppButton } from '../../../shared/button/button';
import { Progetti } from '../../progetti';
import { ResourceDetailsGridComponent } from './resource-details-grid/resource-details-grid';
import { ProjectEmployee } from '../progetto-employee.model';

@Component({
  selector: 'app-visualizza',
  standalone: true,
  imports: [AppButton, ResourceDetailsGridComponent],
  templateUrl: './visualizza.html',
  styleUrls: ['./visualizza.css', '../../../shared/progetto-form.css'],
})
export class Visualizza {
  // Leggiamo l’ID dalla route (es. /progetti/:id)
  private route = inject(ActivatedRoute);
  // Usiamo la history del browser per tornare indietro
  private location = inject(Location);
  private requests = inject(RequestsService);

  loading = signal(true);
  error = signal<string | null>(null);
  progetto = signal<Progetto | null>(null);
  selectedResource = signal<ProjectEmployee | null>(null);

  readonly headersProgetti: Partial<Record<keyof Progetto, string>> = PROGETTO_COMPLETO_HEADERS;
  readonly headersArray = Object.entries(this.headersProgetti)
    .filter(([key]) => key !== 'id')
    .map(([key, label]) => ({
      key: key as keyof Progetto,
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

    this.requests.caricaProgettoById(id).subscribe({
      next: (p) => {
        console.log('Progetto caricato:', p);
        this.progetto.set(p);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore API:', err);
        this.error.set('Errore nel caricamento del progetto.');
        this.loading.set(false);
      },
    });
  }

  apriDettagliRisorsa(employee: ProjectEmployee) {
    this.selectedResource.set(employee);
  }

  getValue(p: Progetto, key: keyof Progetto): string {
    const progettoValue = p[key];

    // format base (evitando [object Object])
    if (progettoValue == null) return '';
    if (Array.isArray(progettoValue)) return progettoValue.join(', ');
    if (typeof progettoValue === 'object') return JSON.stringify(progettoValue);
    return String(progettoValue);
  }

  gestisciSalvataggio(progettoAggiornato: Progetto) {
    console.log("Ricevuto progetto aggiornato dall'output:", progettoAggiornato);
    this.progetto.set(progettoAggiornato);
  }

  indietro() {
    this.location.back();
  }
}
