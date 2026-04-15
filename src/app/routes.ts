import { Routes } from '@angular/router';
import { Progetti } from './progetti/progetti';
import { Visualizza } from './progetti/progetto/visualizza/visualizza';
import { Visualizza as VisualizzaCliente } from './clienti/visualizza/visualizza';
import { elencoProgettiCliente } from './clienti/visualizza/progetti-attivi-cliente/progetti-attivi-cliente';
import { Grid } from './grid/grid';
import { Clienti } from './clienti/clienti';

export const routes: Routes = [
  { path: 'home', component: Grid },
  { path: 'clienti', component: Clienti },
  { path: 'progetti', component: Progetti },
  { path: 'progetti/:id', component: Visualizza },
  { path: 'clienti/:id', component: VisualizzaCliente },
  { path: 'clienti/:id/progetti-attivi-cliente', component: elencoProgettiCliente },

  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
