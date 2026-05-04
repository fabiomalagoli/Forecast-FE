import { Routes } from '@angular/router';
import { Visualizza } from './progetti/progetto/visualizza/visualizza';
import { Progetti } from './progetti/progetti';
import { Clienti } from './clienti/clienti';
import { RolesComponent } from './roles/roles';
import { Grid } from './grid/grid';
import { Visualizza as VisualizzaCliente } from './clienti/visualizza/visualizza';
import { elencoProgettiCliente } from './clienti/visualizza/progetti-attivi-cliente/progetti-attivi-cliente';
import { RisorseComponent } from './risorse/risorse';

export const routes: Routes = [  
  { path: 'home', component: Grid },

  { path: 'clienti', component: Clienti },
  { path: 'clienti/:id', component: VisualizzaCliente },

  { path: 'progetti', component: Progetti },
  { path: 'progetti/:id', component: Visualizza },

  { path : 'clienti/:id/progetti-attivi-cliente', component: elencoProgettiCliente },

  { path: 'ruoli', component: RolesComponent },

  { path: 'risorse', component: RisorseComponent },

  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
