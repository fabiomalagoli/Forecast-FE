import { Routes } from '@angular/router';
import { VisualizzaProgettoComponent } from './progetti/progetto/visualizza/visualizza';
import { ProgettiComponent } from './progetti/progetti';
import { ClientiComponent } from './clienti/clienti';
import { RolesComponent } from './roles/roles';
import { GridComponent } from './grid/grid';
import { VisualizzaClienteComponent } from './clienti/visualizza/visualizza';
import { ElencoProgettiClienteComponent } from './clienti/visualizza/progetti-attivi-cliente/progetti-attivi-cliente';
import { RisorseComponent } from './risorse/risorse';
import { DettagliRisorsaComponent } from './risorse/dettagli-risorsa/dettagli-risorsa';

export const routes: Routes = [  
  { path: 'home', component: GridComponent },

  { path: 'clienti', component: ClientiComponent },
  { path: 'clienti/:id', component: VisualizzaClienteComponent },

  { path: 'progetti', component: ProgettiComponent },
  { path: 'progetti/:id', component: VisualizzaProgettoComponent },

  { path : 'clienti/:id/progetti-attivi-cliente', component: ElencoProgettiClienteComponent },

  { path: 'ruoli', component: RolesComponent },

  { path: 'risorse/:id', component: DettagliRisorsaComponent },
  { path: 'risorse', component: RisorseComponent },

  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
