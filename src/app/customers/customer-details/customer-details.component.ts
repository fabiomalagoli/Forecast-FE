import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { Customer } from '../customer/customer.model';
import { RequestsService } from '../../shared/requests.service';
import { COMPLETE_CUSTOMER_HEADERS } from '../customer/complete-customer.headers';
import { AppButtonComponent } from '../../shared/button/button';
import { Project } from '../../projects/project/project.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-visualizza',
  standalone: true,
  imports: [AppButtonComponent, RouterModule],
  templateUrl: './customer-details.component.html',
  styleUrls: ['./customer-details.component.css', '../../shared/progetto-form.css'],
})
export class CustomerDetailsComponent {
  // Leggiamo l'ID dalla route (es. /clienti/:id)
  private route = inject(ActivatedRoute);
  // Usiamo la history del browser per tornare indietro
  private location = inject(Location);
  private router = inject(Router);
  private requests = inject(RequestsService);

  MostraProgettiAttivi = signal(false);
  loading = signal(true);
  error = signal<string | null>(null);
  cliente = signal<Customer | null>(null);

  /*    address?: string,
    streetNumber?: string,
    postalCode?: string,
    city?: string,
    province?: string,
    country?: string,*/ 


  readonly headersClienti: Record<keyof Customer, string> = COMPLETE_CUSTOMER_HEADERS;
  readonly headersArray = Object.entries(this.headersClienti)
    .filter(([key]) => key !== 'id'
                    && key !== 'address'
                    && key !== 'streetNumber'
                    && key !== 'postalCode'
                    && key !== 'city'
                    && key !== 'province'
                    && key !== 'country')
    .map(([key, label]) => ({
      key: key as keyof Customer,
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
      key: key as keyof Project,
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

    this.requests.caricaClienteById(id).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (c) => {
        console.log('Cliente caricato:', c);
        this.cliente.set(c);
      },
      error: (err) => {
        console.error('Errore API:', err);
        this.error.set('Errore nel caricamento del cliente.');
      },
    });
  }

  getValue(c: Customer, key: keyof Customer): string {
    const clienteValue = c[key];

    // format base (evita [object Object])
    if (clienteValue == null) return '';
    if (Array.isArray(clienteValue)) return clienteValue.join(', ');
    if (typeof clienteValue === 'object') return JSON.stringify(clienteValue);
    return String(clienteValue);
  }

  getProgettoValue(p: Project, key: keyof Project): string {
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
