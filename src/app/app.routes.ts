import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthenticationComponent } from './pages/authentication/authentication.component';

import { ProjectsComponent } from './pages/projects/projects.component';
import { ProjectDetailsComponent } from './pages/projects/project/project-details/project-details.component';
import { CustomerDetailsComponent } from './pages/customers/customer-details/customer-details.component';
import { CustomerProjectsComponent } from './pages/customers/customer-details/customer-projects/customer-projects.component';
import { GridComponent } from './pages/grid/grid.component';
import { CustomersComponent } from './pages/customers/customers.component';
import { RolesComponent } from './pages/roles/roles.component';
import { EmployeesComponent } from './pages/employees/employees.component';
import { EmployeeDetailsComponent } from './pages/employees/employee-details/employee-details.component';
import { WorkGroupsComponent } from './pages/work-groups/work-groups.component';

export const routes: Routes = [
  // Rotta pubblica di Login
  { path: 'login', component: AuthenticationComponent },
  // Rotta publica di Registrazione
  { path: 'register', component: AuthenticationComponent },

  // Rotte private (protette da authGuard)
  { path: 'home', component: GridComponent, canActivate: [authGuard] },
  { path: 'clienti', component: CustomersComponent, canActivate: [authGuard] },
  { path: 'clienti/:id', component: CustomerDetailsComponent, canActivate: [authGuard] },
  { path: 'progetti', component: ProjectsComponent, canActivate: [authGuard] },
  { path: 'progetti/:id', component: ProjectDetailsComponent, canActivate: [authGuard] },
  { path: 'clienti/:id/progetti-attivi-cliente', component: CustomerProjectsComponent, canActivate: [authGuard] },
  { path: 'ruoli', component: RolesComponent, canActivate: [authGuard] },
  { path: 'risorse/:id', component: EmployeeDetailsComponent, canActivate: [authGuard] },
  { path: 'risorse', component: EmployeesComponent, canActivate: [authGuard] },
  { path: 'workgroups', component: WorkGroupsComponent, canActivate: [authGuard] },

  // Redirect predefiniti
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];