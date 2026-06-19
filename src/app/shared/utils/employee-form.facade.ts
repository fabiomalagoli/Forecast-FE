import { inject, Injectable, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, Observable, tap } from 'rxjs';
import { RolesService } from '../services/roles.service';
import { LookupsService } from '../services/lookups.service';
import { EMPLOYEES_HEADERS_FORM } from '../../pages/employees/employee.headers';
import { Employee } from '../models/employee.model';

@Injectable()
export class EmployeeFormFacade {
  private fb = inject(FormBuilder);
  private rolesService = inject(RolesService);
  private lookupsService = inject(LookupsService);

  // Liste dei Lookup per i menù a tendina
  jobRolesList = signal<any[]>([]);
  jobRoleLevelsList = signal<any[]>([]);
  companiesList = signal<any[]>([]);

  jobRoleDropdownOpen = signal(false);
  showAllJobRoles = signal(false);

  // Snapshot per tracciare le modifiche
  originalFormSnapshot = signal('');

  readonly headers = (Object.entries(EMPLOYEES_HEADERS_FORM) as [keyof Employee, string][])
    .filter(([key]) => key !== 'id' && key !== 'isActive') 
    .map(([key, label]) => ({ key, label }));

  loadAllLookups(): Observable<any> {
    return forkJoin({
      roles: this.rolesService.loadAllJobRoles(),
      levels: this.rolesService.loadJobRoleLevels(),
      companies: this.lookupsService.loadAvailableCompanies()
    }).pipe(
      tap((results) => {
        this.jobRolesList.set(results.roles);
        this.jobRoleLevelsList.set(results.levels);
        this.companiesList.set(results.companies);
      })
    );
  }

  buildForm(initialData: any = {}): FormGroup {
    const formControls: { [key: string]: any } = {};

    this.headers.forEach(header => {
      const initialValue = initialData[header.key] || '';
      formControls[header.key] = [initialValue, Validators.required];
    });

    return this.fb.group(formControls);
  }

  optionName(opt: any): string {
    return opt?.name || opt?.Name || opt || '';
  }

  getFilteredJobRoles(form: FormGroup): any[] {
    const term = this.showAllJobRoles()
      ? ''
      : (form.get('jobRole')?.value || '').toString().trim().toLowerCase();

    if (!term) return this.jobRolesList();

    return this.jobRolesList().filter((role) =>
      this.optionName(role).toLowerCase().includes(term)
    );
  }

  isChanged(form: FormGroup): boolean {
    if (!form) return false;
    return JSON.stringify(form.getRawValue()) !== this.originalFormSnapshot();
  }

  isButtonDisabled(form: FormGroup, isSaving: boolean): boolean {
    return form.invalid || !this.isChanged(form) || isSaving;
  }

  getRequiredErrorMessage(key: string): string {
    const messages: Record<string, string> = {
      name: 'Nome obbligatorio',
      surname: 'Cognome obbligatorio',
      jobRole: 'Ruolo obbligatorio',
      jobRoleLevel: 'Livello obbligatorio',
      company: 'Azienda obbligatoria'
    };
    return messages[key] || 'Campo obbligatorio';
  }
}