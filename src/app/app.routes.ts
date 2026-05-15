import { Routes } from '@angular/router';
import { ProjectsComponent } from './projects/projects.component';
import { ProjectDetailsComponent } from './projects/project/project-details/project-details.component';
import { CustomerDetailsComponent } from './customers/customer-details/customer-details.component';
import { CustomerProjectsComponent } from './customers/customer-details/customer-projects/customer-projects.component';
import { GridComponent } from './grid/grid';
import { CustomersComponent } from './customers/customers.component';
import { RolesComponent } from './roles/roles.component';
import { EmployeesComponent } from './employees/employees.component';
import { EmployeeDetailsComponent } from './employees/employee-details/employee-details.component';
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
