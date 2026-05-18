import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { Customer } from '../../../shared/models/customer.model';
import { COMPLETE_CUSTOMER_HEADERS } from '../customer/complete-customer.headers';
import { AppButtonComponent } from '../../../shared/button/button';
import { Project } from '../../../shared/models/project.model';
import { finalize } from 'rxjs';
import { CustomersService } from '../../../shared/services/customers.service';

@Component({
  selector: 'app-customer-details',
  standalone: true,
  imports: [AppButtonComponent, RouterModule],
  templateUrl: './customer-details.component.html',
  styleUrls: ['./customer-details.component.scss', '../../../shared/progetto-form.css'],
})
export class CustomerDetailsComponent {
  // Leggiamo l'ID dalla route (es. /clienti/:id)
  private route = inject(ActivatedRoute);
  // Usiamo la history del browser per tornare indietro
  private location = inject(Location);
  private router = inject(Router);
  private customersService = inject(CustomersService);

  showActiveProjects = signal(false);
  loading = signal(true);
  error = signal<string | null>(null);
  customer = signal<Customer | null>(null);

  readonly customerHeaders: Record<keyof Customer, string> = COMPLETE_CUSTOMER_HEADERS;
  readonly headersArray = Object.entries(this.customerHeaders)
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

    readonly projectsHeaders = {
      name: 'Nome Progetto',
      company: 'Azienda',
      totalBudget: 'Budget Totale',
      projectStatus: 'Stato',
    };
    readonly headersProgettiArray = Object.entries(this.projectsHeaders)
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

    this.customersService.loadCustomerById(id).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (c) => {
        console.log('Cliente caricato:', c);
        this.customer.set(c);
      },
      error: (err) => {
        console.error('Errore API:', err);
        this.error.set('Errore nel caricamento del cliente.');
      },
    });
  }

  getValue(c: Customer, key: keyof Customer): string {
    const customerValue = c[key];

    // format base (evita [object Object])
    if (customerValue == null) return '';
    if (Array.isArray(customerValue)) return customerValue.join(', ');
    if (typeof customerValue === 'object') return JSON.stringify(customerValue);
    return String(customerValue);
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

  showProjects() {
    this.showActiveProjects.set(true);
  }

  goToProjects() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.router.navigate(['/clienti', id, 'progetti-attivi-cliente']);
    }
  }
}
