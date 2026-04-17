import { CommonModule } from '@angular/common';
import { Component, input, output, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Progetto } from '../../../progetti/progetto/progetto.model';
import { ProjectEmployee } from '../../../progetti/progetto/progetto-employee.model';
import { TextInputComponent } from "../../../shared/text-input/text-input";
import { PROGETTO_COMPLETO_HEADERS } from '../../progetto/progetto-completo.headers';
import { RequestsService } from '../../../shared/requests.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-modifica-progetto',
  standalone: true,
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './modifica.html',
  styleUrls: ['../../new-progetto/new-progetto.css', '../../../shared/progetto-form.css', './modifica.css'],
})
export class ModificaComponent implements OnInit {
  private requests = inject(RequestsService);

  // Liste per dropdown
  listaAziende = signal<any[]>([]);
  listaPM = signal<any[]>([]);
  listaClienti = signal<any[]>([]);
  listaStatiProgetto = signal<any[]>([]);
  listaEmployees = signal<any[]>([]);
  listaJobRoles = signal<any[]>([]);
  listaJobRoleLevels = signal<any[]>([]);

  // Riceviamo il progetto da modificare
  progettoDaModificare = input.required<Progetto>();

  // Output per comunicare al padre il progetto modificato o l'annullamento
  saved = output<Progetto>();
  cancel = output<void>();

  // Variabili per gestione stato del form e messaggi
  private dataOriginale: string = '';
  private initialDataObj: any = null; // Ci serve per il CSS (vedi sotto)
  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  dateRangeError = false;

  formData: any = {};

  // Headers dinamici PROGETTO_COMPLETO_HEADERS, escludendo campi non editabili
  readonly headers = (Object.entries(PROGETTO_COMPLETO_HEADERS) as [keyof Progetto, string][])
    .filter(([key]) => key !== 'id' && key !== 'projectEmployees' && key !== 'projectJobRoles')
    .map(([key, label]) => {
      let finalKey = key as string;
      if (['company', 'customer', 'pm', 'projectStatus'].includes(finalKey)) {
        finalKey += 'Id';
      }
      return { key: finalKey, label };
    });
  readonly statusOptions: Progetto['projectStatus'][] = [
    'Initiation',
    'Planning',
    'Execution',
    'Monitoring',
    'Closing',
  ];

  ngOnInit() {
    const p = this.progettoDaModificare();
    this.formData = JSON.parse(JSON.stringify(p));

    // Definiamo tutte le chiamate necessarie
    const caricamenti = {
      aziende: this.requests.caricaAziendeDisponibili(),
      clienti: this.requests.caricaClientiDisponibili(),
      stati: this.requests.caricaStatiProgettoDisponibili(),
      employees: this.requests.caricaEmployeesDisponibili(),
      roles: this.requests.caricaJobRolesDisponibili(),
      levels: this.requests.caricaJobRoleLevelsDisponibili()
    };

    forkJoin(caricamenti).subscribe(risultati => {
      this.listaAziende.set(risultati.aziende);
      this.listaClienti.set(risultati.clienti);
      this.listaStatiProgetto.set(risultati.stati);
      this.listaEmployees.set(risultati.employees);
      this.listaJobRoles.set(risultati.roles);
      this.listaJobRoleLevels.set(risultati.levels);

      // Mappatura ID principali
      this.formData.companyId = risultati.aziende.find(a => a.name === this.formData.company)?.id || null;
      this.formData.customerId = risultati.clienti.find(c => c.name === this.formData.customer)?.id || null;
      this.formData.projectStatusId = risultati.stati.find(s => s.name === this.formData.projectStatus)?.id || null;

      if (this.formData.pm) {
        const pmCercato = this.formData.pm.trim().toLowerCase();
        
        const pmTrovato = risultati.employees.find(e => {
          const nomeCompleto = `${e.name} ${e.surname}`.trim().toLowerCase();
          const nomeInvertito = `${e.surname} ${e.name}`.trim().toLowerCase();
          // Controlliamo entrambi i casi (Nome Cognome o Cognome Nome)
          return nomeCompleto === pmCercato || nomeInvertito === pmCercato;
        });

        this.formData.pmId = pmTrovato?.id || null;
      } else {
        this.formData.pmId = null;
      }

      // Mappatura Ruoli: Se non trovi l'ID, metti null o mantieni l'ID esistente
      if (this.formData.projectJobRoles) {
        this.formData.projectJobRoles = this.formData.projectJobRoles.map((role: any) => {
          // Se role.jobRole è già un UUID, viene usato. 
          // Altrimenti cercalo nella lista tramite il nome.
          const isUuid = /^[0-9a-fA-F-]{36}$/.test(role.jobRole);
          const jobRoleId = isUuid ? role.jobRole : risultati.roles.find((r: any) => r.name === role.jobRole)?.id;
          
          const isLvlUuid = /^[0-9a-fA-F-]{36}$/.test(role.jobRoleLevel);
          const jobRoleLevelId = isLvlUuid ? role.jobRoleLevel : risultati.levels.find((l: any) => l.name === role.jobRoleLevel)?.id;

          return {
            ...role,
            jobRole: jobRoleId || null,
            jobRoleLevel: jobRoleLevelId || null,
            dailyCost: role.dailyCost || 0,
            daysSpent: Number(role.daysSpent || 0),
            winProbability: role.winProbability || 0
          };
        });
      }

      //Mappatura Employees: Se non trovi l'ID, metti null o mantieni l'ID esistente
      if (this.formData.projectEmployees) {
        this.formData.projectEmployees = this.formData.projectEmployees.map((emp: any) => {
          // Se abbiamo già un ID valido (UUID), usiamolo direttamente
          const isUuid = /^[0-9a-fA-F-]{36}$/.test(emp.employeeId);
          if (isUuid) return { ...emp, daysSpent: Number(emp.daysSpent || 0) };

          // Altrimenti, cerchiamo l'ID nella lista delle risorse (come fatto per il PM)
          const nomeDaCercare = emp.employee?.trim().toLowerCase();
          
          const risorsaTrovata = risultati.employees.find(e => {
            const nomeCompleto = `${e.name} ${e.surname}`.trim().toLowerCase();
            const nomeInvertito = `${e.surname} ${e.name}`.trim().toLowerCase();
            // Controlliamo entrambi gli ordini: "Nome Cognome" e "Cognome Nome"
            return nomeCompleto === nomeDaCercare || nomeInvertito === nomeDaCercare;
          });

          return {
            ...emp,
            employeeId: risorsaTrovata?.id || null, // Assegniamo l'ID trovato
            dailyCost: emp.dailyCost || 0,
            daysSpent: Number(emp.daysSpent || 0),
            winProbability: emp.winProbability || 0
          };
        });
      }


      // Normalizzazione finale
      this.formData.startDate = this.formData.startDate?.split('T')[0] || '';
      this.formData.endDate = this.formData.endDate?.split('T')[0] || '';
      this.formData.winProbability = Number(this.formData.winProbability || 0);
      this.formData.totalDays = Number(this.formData.totalDays || 0);
      const budgetNumerico = this.parseBudgetNumber(this.formData.totalBudget);
      this.formData.totalBudget = this.formattaValuta(budgetNumerico);

      this.dataOriginale = JSON.stringify(this.formData);
      this.initialDataObj = JSON.parse(this.dataOriginale);
    });
  }

  isChanged(): boolean {
    // Se la stringa attuale è diversa da quella iniziale, l'utente ha toccato qualcosa
    console.log("Comparing current form data with original:");
    console.log("Current:", this.formData);
    console.log("Original:", this.initialDataObj);
    return JSON.stringify(this.formData) !== this.dataOriginale;
  }

  isFieldChanged(key: string): boolean {
  if (!this.initialDataObj) return false;
  return JSON.stringify(this.formData[key]) !== JSON.stringify(this.initialDataObj[key]);
  }

  isRoleFieldChanged(index: number, field: string): boolean {
    const originalRole = this.initialDataObj.projectJobRoles?.[index];
    if (!originalRole) return true; // È un nuovo ruolo
    return JSON.stringify(this.formData.projectJobRoles[index][field]) !== JSON.stringify(originalRole[field]);
  }

  isSubmitDisabled(form: NgForm): boolean {
    // Disabilitiamo il submit se il form è invalido, se non ci sono cambiamenti o se i ruoli non sono completi
    return form.invalid || !this.hasValidRoles() || !this.hasValidResources() || !this.isChanged();
  }

  onSubmitClick(form: NgForm, event: Event) {
    // Se non ci sono cambiamenti, blocchiamo il submit e mostriamo un messaggio
    if (!this.isChanged()) {
      event.preventDefault();
      this.noChangesMessage = true;
      return;
    }

    if (form.invalid || !this.hasValidRoles()) {
      // Se il form è invalido o i ruoli non sono completi, blocchiamo il submit e mostriamo un messaggio
      event.preventDefault();
      this.attemptedSubmit = true;
    }
  }

  onFieldChange() {
    this.noChangesMessage = false;
  }

  private isTempIdRoles(id: string): boolean {
  // Se l'ID non è presente nei ruoli originali del progetto, lo consideriamo nuovo
    return !this.progettoDaModificare().projectJobRoles?.some(r => r.id === id);
  }

  private isTempIdResources(id: string): boolean {
    // Se l'ID non è presente nelle risorse originali del progetto, lo consideriamo nuovo
    return !this.progettoDaModificare().projectEmployees?.some((employee: ProjectEmployee) => employee.id === id);
  }

  ricalcolaTotali() {
    const ruoli = this.formData.projectJobRoles || [];
    const risorse = this.formData.projectEmployees || [];
    const tutteLeVoci = [...ruoli, ...risorse];

    const totaleGiorni = tutteLeVoci.reduce((sum: number, item: any) => sum + Number(item.daysSpent || 0), 0);
    const totaleBudget = tutteLeVoci.reduce((sum: number, item: any) => {
      const dailyCost = this.parseBudgetNumber(item.dailyCost);
      const days = Number(item.daysSpent || 0);
      return sum + (dailyCost * days);
    }, 0);

    this.formData.totalDays = totaleGiorni;
    this.formData.totalBudget = this.formattaValuta(totaleBudget); // Formattiamo il budget come stringa con simbolo €
  }

  submit(form: NgForm) {
    if (form.invalid || !this.hasValidRoles() || !this.isChanged()) return;

    const p = this.formData;
    const projectId = this.progettoDaModificare().id;
    const chiamate: any[] = [];

    const selectedCompany = this.listaAziende().find(a => a.id === p.companyId)?.name;
    const selectedCustomer = this.listaClienti().find(c => c.id === p.customerId)?.name;
    const selectedStatus = this.listaStatiProgetto().find(s => s.id === p.projectStatusId)?.name;
    const selectedPm = this.listaEmployees().find(e => e.id === p.pmId);

    const ruoliOriginali = this.progettoDaModificare().projectJobRoles || [];
    const ruoliDaRimuovere = ruoliOriginali.filter((r: any) => !p.projectJobRoles?.some((nr: any) => nr.id === r.id));

    const risorseOriginali = this.progettoDaModificare().projectEmployees || [];
    const risorseDaRimuovere = risorseOriginali.filter((originale: ProjectEmployee) => 
      !p.projectEmployees?.some((attuale: any) => attuale.id === originale.id)
);
    // Aggiungiamo le chiamate per rimuovere i ruoli eliminati
    ruoliDaRimuovere.forEach((r: any) => {
      chiamate.push(this.requests.EliminaProjectJobRole(projectId, r.id));
    });

    // Aggiungiamo le chiamate per rimuovere le risorse eliminate
    risorseDaRimuovere.forEach((employee: ProjectEmployee) => {
      chiamate.push(this.requests.EliminaProjectEmployee(projectId, employee.id));
    });

    const payloadProgetto: any = {
      ...p,
      id: projectId,
      company: selectedCompany,
      customer: selectedCustomer,
      projectStatus: selectedStatus,
      pm: selectedPm ? `${selectedPm.name} ${selectedPm.surname}` : p.pm,
      winProbability: Number(p.winProbability),
      totalDays: Number(p.totalDays),
      totalBudget: this.parseBudgetNumber(p.totalBudget)
    };

    // Rimuoviamo lista ruoli dal payload del progetto per evitare conflitti lato backend
    delete payloadProgetto.projectJobRoles;

    // Rimuoviamo lista risorse dal payload del progetto per evitare conflitti lato backend
    delete payloadProgetto.projectEmployees;

    chiamate.push(this.requests.aggiornaProgetto(payloadProgetto));

    p.projectJobRoles.forEach((role: any) => {
      const nomeRuolo = this.listaJobRoles().find(j => j.id === role.jobRole)?.name || '';
      
      const roleData = {
        jobRoleId: role.jobRole, 
        jobRoleLevelId: role.jobRoleLevel, 
        
        // Campi numerici
        dailyCost: this.parseBudgetNumber(role.dailyCost),
        daysSpent: Number(role.daysSpent),
        winProbability: this.parseDecimal(role.winProbability)
      };

      if (this.isTempIdRoles(role.id)) {
        chiamate.push(this.requests.aggiungiProjectJobRole(projectId, [roleData]));
      } else {
        chiamate.push(this.requests.aggiornaProjectJobRole(projectId, role.id, roleData));
      }
    });

    p.projectEmployees.forEach((employee: any) => {
      const nomeRisorsa = this.listaEmployees().find(e => e.id === employee.employeeId)?.name || '';
      
      const employeeData = {
        EmployeeId: employee.employeeId,
        dailyCost: this.parseBudgetNumber(employee.dailyCost),
        daysSpent: Number(employee.daysSpent),
        winProbability: this.parseDecimal(employee.winProbability)
      };

      console.log("Dati risorsa inviati:", employeeData);

      if (this.isTempIdResources(employee.id)) {
        chiamate.push(this.requests.aggiungiProjectEmployee(projectId, [employeeData]));
      } else {
        chiamate.push(this.requests.aggiornaProjectEmployee(projectId, employee.id, employeeData));
      }
    });



    forkJoin(chiamate).subscribe({ // TO-DO : pass an array of sources instead of an object
      next: () => {
        this.showNotification('Progetto e ruoli aggiornati con successo!', 'success');
        this.saved.emit(this.formData);
        this.dataOriginale = JSON.stringify(this.formData); // Reset stato modifiche
      },
      error: (error) => {
        console.error("Errore durante il salvataggio massivo:", error);
        this.showNotification('Errore durante l\'aggiornamento di alcuni dati.', 'error');
      }
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  isNumericField(key: string): boolean {
    return key === 'winProbability' || key === 'totalDays';
  }

  getPattern(key: string): string {
    if (key === 'winProbability') {
      return '^(100|[1-9][0-9]?)$';
    }
    // if (key === 'totalBudget'
    //   && this.formData.totalBudget !== ''
    //   && this.formData.totalBudget !== null
    //   && this.formData.totalBudget !== undefined
    //   && this.formData.totalBudget !== 'Not yet calculated.'
    //   && this.formData.totalBudget !== 'Non ancora calcolato.'
    //   && this.formData.totalBudget !== 0) {
    //   return '^\\s*(?:\\u20AC\\s*)?(?:\\d{1,3}(?:[.,]\\d{3})*|\\d+)(?:[.,]\\d{1,2})?\\s*(?:\\u20AC\\s*)?$';
    // }
    if (this.isNumericField(key)) {
      return '^[0-9]+$';
    }
    return '';
  }

  getOptions(key: string): any[] {
  switch (key) {
    case 'projectStatusId': return this.listaStatiProgetto();
    case 'companyId': return this.listaAziende();
    case 'customerId': return this.listaClienti();
    case 'pmId': return this.listaEmployees();
    default: return [];
    }
  }

  private getTodayIsoDate(): string {
    const today = new Date();
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  onDateChange() {
    const start = this.parseIsoDate(this.formData.startDate);
    const end = this.parseIsoDate(this.formData.endDate);

    if (!start || !end) {
      // Se non ho entrambe le date, non posso calcolare i giorni
      this.dateRangeError = false;
      this.formData.totalDays = '';
      return;
    }

    if (end < start) {
      // Data fine prima della data inizio: segnalo e lascio i giorni vuoti
      this.dateRangeError = true;
      this.formData.totalDays = '';
      return;
    }

    this.dateRangeError = false;
    const diffDays = this.diffGiorniEsclusivo(start, end);
    this.formData.totalDays = diffDays;
  }

  onTotalDaysChange() {
    const start = this.parseIsoDate(this.formData.startDate);
    const totalDays = Number(this.formData.totalDays);

    if (!start || !Number.isFinite(totalDays) || totalDays <= 0) {
      this.formData.endDate = '';
      return;
    }

    this.dateRangeError = false;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + Math.floor(totalDays));
    this.formData.endDate = end.toISOString().slice(0, 10);
  }

  private parseIsoDate(value: string | undefined): Date | null {
    if (!value) return null;
    // Parsing semplice e stabile per input date (formato YYYY-MM-DD)
    const [y, m, d] = value.split('-').map((v) => Number(v));
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }

  private diffGiorniEsclusivo(start: Date, end: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.floor((end.getTime() - start.getTime()) / msPerDay);
    return diff;
  }

  private parseBudgetNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return NaN;
    // Normalizziamo il budget per gestire €, punti e virgole
    const raw = String(value).trim().replace(/[\u20AC\s]/g, '');
    if (!raw) return NaN;
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    let normalized = raw;
    if (lastComma !== -1 && lastDot !== -1) {
      const decimalIndex = lastComma > lastDot ? lastComma : lastDot;
      normalized = raw.replace(/[.,]/g, (match, offset) => (offset === decimalIndex ? '.' : ''));
    } else if (lastComma !== -1) {
      normalized = raw.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = raw.replace(/,/g, '');
    }
    return Number(normalized);
  }

  toId(key: string, i: number): string {
    return `progetto-${i}-${key}`
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase();
  } //funzione per evitare problemi di caratteri speciali e maiuscole eventuali

  aggiungiRuolo() {
    if (!this.formData.projectJobRoles) {
      this.formData.projectJobRoles = [];
      this.ricalcolaTotali(); // Per aggiornare totalDays e totalBudget se prima non c'erano ruoli
    }

    this.formData.projectJobRoles.push({
      id: crypto.randomUUID(),
      jobRole: null,      // Legato a r-role-i nell'HTML
      jobRoleLevel: null, // Legato a r-lvl-i nell'HTML
      dailyCost: null,
      daysSpent: null,
      winProbability: null
    });
  }

  aggiungiRisorsa() {
    if (!this.formData.projectEmployees) {
      this.formData.projectEmployees = [];
    }

    this.formData.projectEmployees.push({
      id: crypto.randomUUID(),
      employeeId: null, // Legato a e-role-i nell'HTML
      dailyCost: null, // Legato a e-cost-i nell'HTML
      daysSpent: null, // Legato a e-days-i nell'HTML
      winProbability: null // Legato a e-win-i nell'HTML
    }); // Aggiungiamo un placeholder null per la nuova risorsa
  }

  rimuoviRuolo(index: number) {
    this.formData.projectJobRoles.splice(index, 1);
    this.ricalcolaTotali(); // Ricalcoliamo totali dopo la rimozione di un ruolo
  }

  rimuoviRisorsa(index: number) {
    this.formData.projectEmployees.splice(index, 1);
    this.ricalcolaTotali(); // Ricalcoliamo totali dopo la rimozione di una risorsa
  }

  hasValidRoles(): boolean {
    const roles = this.formData.projectJobRoles;
    if (!roles || roles.length === 0) return true;
    return roles.every((role: any) => this.isRoleComplete(role));
  }

  hasValidResources(): boolean {
    const risorse = this.formData.projectEmployees;
    if (!risorse || risorse.length === 0) return true;
    return risorse.every((r: any) => 
      !!r.employeeId && 
      this.parseBudgetNumber(r.dailyCost) > 0 && 
      Number(r.daysSpent) > 0
    );
  }

  private isRoleComplete(role: any): boolean {
    const hasRole = !!role?.jobRole && String(role.jobRole).trim() !== '';
    const hasLevel = !!role?.jobRoleLevel && String(role.jobRoleLevel).trim() !== '';
    
    const cost = this.parseBudgetNumber(role?.dailyCost);
    const hasDailyCost = !isNaN(cost) && cost > 0;

    const days = Number(role?.daysSpent);
    const hasDaysSpent = !isNaN(days) && days > 0;
    
    const roleWin = this.parseDecimal(role?.winProbability);
    const hasWinProbability = !isNaN(roleWin) && roleWin >= 0.1 && roleWin <= 1;

    return !!(hasRole && hasLevel && hasDailyCost && hasDaysSpent && hasWinProbability);
  }

  private parseDecimal(value: unknown): number {
    if (value === null || value === undefined || value === '') return NaN;
    const raw = String(value).trim().replace(',', '.');
    const num = Number(raw);
    return Number.isFinite(num) ? num : NaN;
  }

  getRoleWinError(role: any): 'required' | 'range' | null {
    const value = role?.winProbability;
    if (value === null || value === undefined || value === '') return 'required';
    const num = this.parseDecimal(value);
    if (!Number.isFinite(num) || num < 0.1 || num > 1) return 'range';
    return null;
  }

  private showNotification(text: string, type: 'success' | 'error') {
    this.statusMessage = { text, type };
    setTimeout(() => {
      this.statusMessage = null;
    }, 3000);
  }

  private getErrorMessage(error: any, fallback: string): string {
    const apiError = error?.error;
    if (typeof apiError === 'string' && apiError.trim()) return apiError;
    if (apiError?.title) return apiError.title;
    if (apiError?.errors && typeof apiError.errors === 'object') {
      const messages = Object.values(apiError.errors).flat();
      if (messages.length) return String(messages.join(' '));
    }
    if (error?.message) return error.message;
    return fallback;
  }

  private formattaValuta(valore: number): string {
    if (isNaN(valore)) return '0,00 €';
  
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(valore);
  }
}
