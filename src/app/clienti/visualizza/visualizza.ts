import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { Cliente } from '../cliente/cliente.model';
import { RequestsService } from '../../shared/requests.service';
import { CLIENTE_COMPLETO_HEADERS } from '../cliente/cliente-completo.headers';
import { AppButton } from '../../shared/button/button';

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

  loading = signal(true);
  error = signal<string | null>(null);
  cliente = signal<Cliente | null>(null);

  readonly headersClienti: Record<keyof Cliente, string> = CLIENTE_COMPLETO_HEADERS;
  readonly headersArray = Object.entries(this.headersClienti)
    .filter(([key]) => key !== 'id')
    .map(([key, label]) => ({
      key: key as keyof Cliente,
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

  indietro() {
    this.location.back();
  }

  vaiAiProgetti() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.router.navigate(['/clienti', id, 'progetti-attivi-cliente']);
    }
  }
}
