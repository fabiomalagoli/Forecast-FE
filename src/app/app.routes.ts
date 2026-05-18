import { Routes } from '@angular/router';
import { ProjectsComponent } from './pages/projects/projects.component';
import { ProjectDetailsComponent } from './pages/projects/project/project-details/project-details.component';
import { CustomerDetailsComponent } from './pages/customers/customer-details/customer-details.component';
import { CustomerProjectsComponent } from './pages/customers/customer-details/customer-projects/customer-projects.component';
import { GridComponent } from './pages/grid/grid.component';
import { CustomersComponent } from './pages/customers/customers.component';
import { RolesComponent } from './pages/roles/roles.component';
import { EmployeesComponent } from './pages/employees/employees.component';
import { EmployeeDetailsComponent } from './pages/employees/employee-details/employee-details.component';
export const routes: Routes = [  
  { path: 'home', component: GridComponent },

  { path: 'clienti', component: CustomersComponent },
  { path: 'clienti/:id', component: CustomerDetailsComponent },

  { path: 'progetti', component: ProjectsComponent },
  { path: 'progetti/:id', component: ProjectDetailsComponent },

  { path : 'clienti/:id/progetti-attivi-cliente', component: CustomerProjectsComponent },

  { path: 'ruoli', component: RolesComponent },

  { path: 'risorse/:id', component: EmployeeDetailsComponent },
  { path: 'risorse', component: EmployeesComponent },

  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
