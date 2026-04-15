import { CommonModule } from '@angular/common';
import { Component, input, output, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Progetto } from '../../../progetti/progetto/progetto.model';
import { TextInputComponent } from "../../../shared/text-input/text-input";
import { PROGETTO_COMPLETO_HEADERS } from '../../progetto/progetto-completo.headers';
import { RequestsService } from '../../../shared/requests.service';

@Component({
  selector: 'app-modifica-progetto',
  standalone: true,
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './modifica.html',
  styleUrls: ['../../new-progetto/new-progetto.css', '../../../shared/progetto-form.css'],
})
export class ModificaComponent implements OnInit {
  private requests = inject(RequestsService);

  // Liste per dropdown
  listaAziende = signal<any[]>([]);
  listaPM = signal<any[]>([]);
  listaClienti = signal<any[]>([]);
  listaStatiProgetto = signal<any[]>([]);
  listaEmployee = signal<any[]>([]);

  // Riceviamo il progetto da modificare
  progettoDaModificare = input.required<Progetto>();

  // Output per comunicare al padre il progetto modificato o l'annullamento
  saved = output<Progetto>();
  cancel = output<void>();

  // Variabili per gestione stato del form e messaggi
  private dataOriginale: string = '';
  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  dateRangeError = false;

  formData: any = {};

  // Headers dinamici basati su PROGETTO_COMPLETO_HEADERS, escludendo campi non editabili
  readonly headers = (Object.entries(PROGETTO_COMPLETO_HEADERS) as [keyof Progetto, string][])
    .filter(([key]) => key !== 'id' && key !== 'projectEmployees' && key !== 'projectJobRoles')
    .map(([key, label]) => {
      // Trasformiamo le chiavi 'visuali' in chiavi 'tecniche' per le tendine
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
  this.formData = JSON.parse(JSON.stringify(p)); // Creiamo formData SUBITO

  // Carichiamo le aziende e cerchiamo l'ID
  this.requests.CaricaAziende().subscribe(data => {
    this.listaAziende.set(data);
    if (!this.formData.companyId && this.formData.company) {
      this.formData.companyId = data.find(a => a.name === this.formData.company)?.id;
    }
  });

  // Carichiamo i clienti e cerchiamo l'ID
  this.requests.caricaClientiDisponibili().subscribe(data => {
    this.listaClienti.set(data);
    if (!this.formData.customerId && this.formData.customer) {
      this.formData.customerId = data.find(c => c.name === this.formData.customer)?.id;
    }
  });

  // Carichiamo gli stati e cerchiamo l'ID
  this.requests.CaricaProjectStatus().subscribe(data => {
    this.listaStatiProgetto.set(data);
    if (!this.formData.projectStatusId && this.formData.projectStatus) {
      this.formData.projectStatusId = data.find(s => s.name === this.formData.projectStatus)?.id;
    }
  });

  // CARICAMENTO EMPLOYEE + FIX PM
  this.requests.caricaEmployees().subscribe(data => {
    this.listaEmployee.set(data);
    // Se pmId è undefined, cerchiamolo usando il nome che abbiamo in formData.pm
    if (!this.formData.pmId && this.formData.pm) {
      const trovato = data.find(e => `${e.name} ${e.surname}` === this.formData.pm);
      if (trovato) {
        this.formData.pmId = trovato.id; // Assegniamo l'ID così la tendina si popola!
      }
    }
  });

  if (this.formData.startDate) this.formData.startDate = this.formData.startDate.split('T')[0];
  if (this.formData.endDate) this.formData.endDate = this.formData.endDate.split('T')[0];

  this.dataOriginale = JSON.stringify(this.formData);
}

  isChanged(): boolean {
    // Se la stringa attuale è diversa da quella iniziale, l'utente ha toccato qualcosa
    return JSON.stringify(this.formData) !== this.dataOriginale;
  }

  isSubmitDisabled(form: NgForm): boolean {
    // Disabilitiamo il submit se il form è invalido, se non ci sono cambiamenti o se i ruoli non sono completi
    return form.invalid || !this.hasValidRoles() || !this.isChanged();
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

  submit(form: NgForm) {
    if (form.invalid || !this.hasValidRoles() || !this.isChanged()) return;


    const p = this.formData;
    // Cerchiamo i nomi corrispondenti agli ID selezionati per la tabella
    const selectedCompany = this.listaAziende().find(a => a.id === p.companyId)?.name;
    const selectedCustomer = this.listaClienti().find(c => c.id === p.customerId)?.name;
    const selectedStatus = this.listaStatiProgetto().find(s => s.id === p.projectStatusId)?.name;
    const selectedPm = this.listaEmployee().find(e => e.id === p.pmId);

    const payloadCompleto: any = {
      ...p,
      id: this.progettoDaModificare().id,
      company: selectedCompany,
      customer: selectedCustomer,
      projectStatus: selectedStatus,
      pm: selectedPm ? `${selectedPm.name} ${selectedPm.surname}` : p.pm,
      // Numeri formattati per la tabella
      winProbability: Number(p.winProbability), 
      totalDays: Number(p.totalDays),
    };

    console.log("Payload finale inviato:", payloadCompleto);

    this.requests.aggiornaProgetto(payloadCompleto).subscribe({
      next: () => {
        this.saved.emit(payloadCompleto);
        this.showNotification('Progetto modificato con successo!', 'success');
      },
      error: (error) => {
        console.error("Errore server:", error);
        this.showNotification('Errore durante il salvataggio.', 'error');
      }
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  isNumericField(key: string): boolean {
    return key === 'winProbability' || key === 'totalDays' || key === 'totalBudget';
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

  getOptions(key: string): any[] {
  switch (key) {
    case 'projectStatusId': return this.listaStatiProgetto();
    case 'companyId': return this.listaAziende();
    case 'customerId': return this.listaClienti();
    case 'pmId': return this.listaEmployee();
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
      // Giorni non validi: evitiamo di aggiornare la data fine
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
    // Parsing semplice e stabile per input date, senza sorprese di fuso orario
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
    }

    // Creiamo un nuovo oggetto ruolo vuoto (con ID temporaneo se necessario)
    this.formData.projectJobRoles.push({
      id: crypto.randomUUID(), // Genera un ID univoco per il trackBy
      jobRole: '',
      jobRoleLevel: 'Junior',
      dailyCost: 0,
      daysSpent: 0,
      winProbability: 0
    });
  }

  rimuoviRuolo(index: number) {
    this.formData.projectJobRoles.splice(index, 1);
  }

  private hasValidRoles(): boolean {
    const roles = this.formData.projectJobRoles;
    if (!roles || roles.length === 0) return true;
    return roles.every((role: any) => this.isRoleComplete(role));
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
}
