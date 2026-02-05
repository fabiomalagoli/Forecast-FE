import { CommonModule } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Progetto } from '../../progetti/progetto/progetto.model';
import { TextInputComponent } from "../../shared/text-input/text-input";
import { PROGETTO_COMPLETO_HEADERS } from '../progetto/progetto-completo.headers';
import { RequestsService } from '../../shared/requests.service';

@Component({
  selector: 'app-new-progetto',
  standalone: true,
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './new-progetto.html',
  styleUrls: ['./new-progetto.css', '../../shared/progetto-form.css'],
})

export class NewProgettoComponent {

  readonly headers = (Object.entries(PROGETTO_COMPLETO_HEADERS) as [keyof Progetto, string][])
  .filter(([key]) => key !== 'id' && key !== 'projectEmployees' && key !== 'projectJobRoles')
  .map(([key, label]) => ({ key, label }));

  readonly statusOptions: Progetto['projectStatus'][] = [
    'Initiation',
    'Planning',
    'Execution',
    'Monitoring',
    'Closing',
  ];

  private requestsService = inject(RequestsService)

  created = output<Progetto>();

  cancel = output<void>();

  formData: any = {
    projectStatus: 'Initiation',
    startDate: this.getTodayIsoDate(),
  };
  attemptedSubmit = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  dateRangeError = false;

  submit(form: NgForm) {
    if (form.invalid || !this.hasValidRoles()) {
      return;
    }

    const winProbability = Number(this.formData.winProbability);
    const totalDays = Number(this.formData.totalDays);
    const totalBudget = this.parseBudgetNumber(this.formData.totalBudget);

    if (isNaN(winProbability) || isNaN(totalDays) || isNaN(totalBudget)) {
      console.error('I campi winProbability, totalDays e totalBudget devono essere numeri.');
      return;
    }
    if (totalBudget < 0) {
      console.error('Il campo totalBudget non può essere negativo.');
      return;
    }

    if (winProbability < 1 || winProbability > 100) {
      console.error('Il campo winProbability deve essere tra 1 e 100.');
      return;
    }

    const progettoCreato = {
      ...this.formData,
      id: this.formData.id ?? crypto.randomUUID(),
      projectEmployees: this.formData.projectEmployees ?? [],
      projectJobRoles: this.formData.projectJobRoles ?? [],
      totalBudget
    } as Progetto;

    this.requestsService.aggiungiNuovoProgetto(progettoCreato).subscribe({
      next: (created) => {
        this.created.emit(created ?? progettoCreato);
        form.resetForm();
        this.formData = {};
        this.attemptedSubmit = false;
      },
      error: (error) => {
        this.showNotification(this.getErrorMessage(error, 'Errore durante la creazione del progetto.'), 'error');
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

  private getTodayIsoDate(): string {
    const today = new Date();
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
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

  isChanged(): boolean {
    return true;
  }

  isSubmitDisabled(form: NgForm): boolean {
    return form.invalid || !this.hasValidRoles();
  }

  onSubmitClick(form: NgForm, event: Event) {
    if (this.isSubmitDisabled(form)) {
      event.preventDefault();
      this.attemptedSubmit = true;
    }
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
