import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Progetto } from '../../progetti/progetto/progetto.model';
import { TextInputComponent } from "../../shared/text-input/text-input";
import { PROGETTO_COMPLETO_HEADERS } from '../progetto/progetto-completo.headers';
import { RequestsService } from '../../shared/requests.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-new-progetto',
  standalone: true,
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './new-progetto.html',
  styleUrls: ['./new-progetto.css', '../../shared/progetto-form.css'],
})

export class NewProgettoComponent implements OnInit{

  private requestsService = inject(RequestsService);

  listaAziende = signal<any[]>([]);
  listaPM = signal<any[]>([]);
  listaClienti = signal<any[]>([]);
  listaStatiProgetto = signal<any[]>([]);
  listaEmployees = signal<any[]>([]);
  listaJobRoles = signal<any[]>([])
  listaJobRoleLevels = signal<any[]>([])
  progettoDaAggiungere = signal<Progetto | null>(null);

  created = output<Progetto>();
  cancel = output<void>();

    // Variabili per gestione stato del form e messaggi
  private dataOriginale: string = '';
  private initialDataObj: any = null; // Ci serve per il CSS (vedi sotto)
  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  dateRangeError = false;

  formData: any = {
    projectStatus: 'Initiation',
    startDate: this.getTodayIsoDate(),
  };

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
    const caricamenti = {
      aziende: this.requestsService.caricaAziendeDisponibili(),
      clienti: this.requestsService.caricaClientiDisponibili(),
      stati: this.requestsService.caricaStatiProgettoDisponibili(),
      roles: this.requestsService.caricaJobRolesDisponibili(),
      levels: this.requestsService.caricaJobRoleLevelsDisponibili(),
      employees: this.requestsService.caricaEmployeesDisponibili()
    };

    forkJoin(caricamenti).subscribe(risultati => {
      this.listaAziende.set(risultati.aziende);
      this.listaClienti.set(risultati.clienti);
      this.listaStatiProgetto.set(risultati.stati);
      this.listaEmployees.set(risultati.employees);
      this.listaJobRoles.set(risultati.roles);
      this.listaJobRoleLevels.set(risultati.levels);

      this.formData = {
        name: '',
        description: '',
        companyId: null,
        customerId: null,
        pmId: null,
        projectStatusId: risultati.stati.find(s => s.name === 'Initiation')?.id || null,
        startDate: this.getTodayIsoDate(),
        endDate: '',
        totalDays: 0,
        winProbability: 0,
        totalBudget: '0,00 €',
        projectEmployees: [],
        projectJobRoles: []
      };

      this.dataOriginale = JSON.stringify(this.formData);
      this.initialDataObj = JSON.parse(this.dataOriginale);
    })
  }
  

  submit(form: NgForm) {
    if (this.isSubmitDisabled(form)) return;

    // 1. Prepariamo il payload del progetto
    const progettoPayload = {
      ...this.formData,
      totalBudget: this.parseBudgetNumber(this.formData.totalBudget)
    };

    // 2. Creiamo il progetto
    this.requestsService.aggiungiNuovoProgetto(progettoPayload).subscribe({
      next: (progettoCreato) => {
        const newProjectId = progettoCreato.id; // L'ID restituito dal DB
        const chiamateDettagli: any[] = [];

        // 3. Prepariamo le chiamate per i Ruoli
        this.formData.projectJobRoles.forEach((role: any) => {
          const roleData = {
            jobRoleId: role.jobRole,
            jobRoleLevelId: role.jobRoleLevel,
            dailyCost: this.parseBudgetNumber(role.dailyCost),
            daysSpent: Number(role.daysSpent),
            winProbability: this.parseDecimal(role.winProbability)
          };
          chiamateDettagli.push(this.requestsService.aggiungiProjectJobRole(newProjectId, [roleData]));
        });

        // 4. Prepariamo le chiamate per le Risorse
        this.formData.projectEmployees.forEach((emp: any) => {
          const empData = {
            EmployeeId: emp.employeeId,
            dailyCost: this.parseBudgetNumber(emp.dailyCost),
            daysSpent: Number(emp.daysSpent),
            winProbability: this.parseDecimal(emp.winProbability)
          };
          chiamateDettagli.push(this.requestsService.aggiungiProjectEmployee(newProjectId, [empData]));
        });

        // 5. Eseguiamo tutto il resto insieme
        if (chiamateDettagli.length > 0) {
          forkJoin(chiamateDettagli).subscribe({
            next: () => {
              this.showNotification('Progetto creato con successo con tutti i dettagli!', 'success');
              this.created.emit(progettoCreato);
            },
            error: () => this.showNotification('Progetto creato, ma errore nel salvataggio di ruoli/risorse.', 'error')
          });
        } else {
          this.created.emit(progettoCreato);
        }
      },
      error: (err) => this.showNotification('Errore nella creazione del progetto.', 'error')
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  isNumericField(key: string): boolean {
    return key === 'winProbability' || key === 'totalDays' || key === 'totalBudget';
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

  isFieldChanged(key: string): boolean {
    if (!this.initialDataObj) return false;
    return JSON.stringify(this.formData[key]) !== JSON.stringify(this.initialDataObj[key]);
  }


  getPattern(key: string): string {
    if (key === 'winProbability') {
      return '^(100|[1-9][0-9]?)$';
    }
    if (key === 'totalBudget') {
      return '^\\s*(?:\\u20AC\\s*)?(?:\\d{1,3}(?:[.,]\\d{3})*|\\d+)(?:[.,]\\d{1,2})?\\s*(?:\\u20AC\\s*)?$';
    }
    if (this.isNumericField(key)) {
      return '^[0-9]+$';
    }
    return '';
  }

  private getTodayIsoDate(): string {
    const today = new Date();
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  onFieldChange() {
    this.noChangesMessage = false;
  }


  onDateChange() {
    const start = this.parseIsoDate(this.formData.startDate);
    const end = this.parseIsoDate(this.formData.endDate);

    if (!start || !end) {
      // Se manca una delle due date, non ha senso calcolare i giorni
      this.dateRangeError = false;
      this.formData.totalDays = '';
      return;
    }

    if (end < start) {
      // Data fine prima dell’inizio: segnaliamo l’errore e lasciamo i giorni vuoti
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
      // Giorni non validi: evitiamo di impostare una data fine “sballata”
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
    // Gestione manuale per evitare problemi di timezone negli input date
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
    // Accettiamo formati diversi (€, punti/migliaia, virgola decimale) e normalizziamo
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

  isChanged(): boolean {
    return true;
  }

  isSubmitDisabled(form: NgForm): boolean {
    return form.invalid || !this.hasValidRoles() || !this.hasValidResources();
  }

  onSubmitClick(form: NgForm, event: Event) {
    if (this.isSubmitDisabled(form)) {
      event.preventDefault();
      this.attemptedSubmit = true;
    }
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
    const hasRole = typeof role?.jobRole === 'string' && role.jobRole.trim().length > 0;
    const hasLevel = typeof role?.jobRoleLevel === 'string' && role.jobRoleLevel.trim().length > 0;
    const hasDailyCost = role?.dailyCost !== null && role?.dailyCost !== undefined && role?.dailyCost !== '';
    const hasDaysSpent = role?.daysSpent !== null && role?.daysSpent !== undefined && role?.daysSpent !== '';
    const roleWin = this.parseDecimal(role?.winProbability);
    const hasWinProbability = Number.isFinite(roleWin) && roleWin >= 0.1 && roleWin <= 1;
    return hasRole && hasLevel && hasDailyCost && hasDaysSpent && hasWinProbability;
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
