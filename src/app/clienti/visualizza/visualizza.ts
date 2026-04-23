import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { Cliente } from '../cliente/cliente.model';
import { RequestsService } from '../../shared/requests.service';
import { CLIENTE_COMPLETO_HEADERS } from '../cliente/cliente-completo.headers';
import { AppButton } from '../../shared/button/button';
import { Progetto } from '../../progetti/progetto/progetto.model';

@Component({
  selector: 'app-visualizza',
  standalone: true,
  imports: [AppButton, RouterModule],
  templateUrl: './visualizza.html',
  styleUrls: ['./visualizza.css', '../../shared/progetto-form.css'],
})
export class Visualizza {
  // Leggiamo l'ID dalla route (es. /clienti/:id)
  private route = inject(ActivatedRoute);
  // Usiamo la history del browser per tornare indietro
  private location = inject(Location);
  private router = inject(Router);
  private requests = inject(RequestsService);

  MostraProgettiAttivi = signal(false);
  loading = signal(true);
  error = signal<string | null>(null);
  cliente = signal<Cliente | null>(null);

  /*    address?: string,
    streetNumber?: string,
    postalCode?: string,
    city?: string,
    province?: string,
    country?: string,*/ 


  readonly headersClienti: Record<keyof Cliente, string> = CLIENTE_COMPLETO_HEADERS;
  readonly headersArray = Object.entries(this.headersClienti)
    .filter(([key]) => key !== 'id'
                    && key !== 'address'
                    && key !== 'streetNumber'
                    && key !== 'postalCode'
                    && key !== 'city'
                    && key !== 'province'
                    && key !== 'country')
    .map(([key, label]) => ({
      key: key as keyof Cliente,
      label,
    }));

    readonly headersProgetti = {
      name: 'Nome Progetto',
      company: 'Azienda',
      totalBudget: 'Budget Totale',
      projectStatus: 'Stato',
    };
    readonly headersProgettiArray = Object.entries(this.headersProgetti)
    .filter(([key]) => key !== 'description') // Escludi campi non necessari
    .map(([key, label]) => ({
      key: key as keyof Progetto,
      label,
    }));
  ngOnInit() {
    console.log("Componente Visualizza Inizializzato");
    const id = this.route.snapshot.paramMap.get('id');
    console.log('ID recuperato:', id);

    if (!id) {
      this.error.set('ID cliente mancante.');
      this.loading.set(false);
      return;
    }

    this.requests.caricaClienteById(id).subscribe({
      next: (c) => {
        console.log('Cliente caricato:', c);
        this.cliente.set(c);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore API:', err);
        this.error.set('Errore nel caricamento del cliente.');
        this.loading.set(false);
      },
    });
  }

  getValue(c: Cliente, key: keyof Cliente): string {
    const clienteValue = c[key];

    // format base (evita [object Object])
    if (clienteValue == null) return '';
    if (Array.isArray(clienteValue)) return clienteValue.join(', ');
    if (typeof clienteValue === 'object') return JSON.stringify(clienteValue);
    return String(clienteValue);
  }

  getProgettoValue(p: Progetto, key: keyof Progetto): string {
    const progettoValue = p[key];
    if (progettoValue == null) return '';
    if (Array.isArray(progettoValue)) return progettoValue.join(', ');
    if (typeof progettoValue === 'object') return JSON.stringify(progettoValue);
    return String(progettoValue);
  }

  indietro() {
    this.location.back();
  }

  mostraProgettiAttivi() {
    this.MostraProgettiAttivi.set(true);
  }

  vaiAiProgetti() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.router.navigate(['/clienti', id, 'progetti-attivi-cliente']);
    }
  }
}
