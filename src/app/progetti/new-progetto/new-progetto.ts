import { CommonModule } from '@angular/common';
import { Component, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Progetto } from '../../progetti/progetto/progetto.model';
import { TextInputComponent } from "../../shared/text-input/text-input";
import { PROGETTO_COMPLETO_HEADERS } from '../progetto/progetto-completo.headers';

@Component({
  selector: 'app-new-progetto',
  standalone: true,
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './new-progetto.html',
  styleUrls: ['./new-progetto.css', '../../shared/progetto-form.css'],
})

export class NewProgettoComponent {

  readonly headers = (Object.entries(PROGETTO_COMPLETO_HEADERS) as [keyof Progetto, string][])
  .filter(([key]) => key !== 'id')
  .map(([key, label]) => ({ key, label }));

  created = output<Progetto>();

  cancel = output<void>();

  formData: any = {
    projectStatus: 'Initiation',
    startDate: this.getTodayIsoDate(),
  };

  submit(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const winProbability = Number(this.formData.winProbability);
    const totalDays = Number(this.formData.totalDays);

    if(isNaN(winProbability) || isNaN(totalDays)) {
      console.error('I campi winProbability e totalDays devono essere numeri.');
      return;
    }

    const progettoCreato = { ...this.formData } as Progetto;
    this.created.emit(progettoCreato);
    form.resetForm();
    this.formData = {};
  }

  onCancel() {
    this.cancel.emit();
  }

  isNumericField(key: string): boolean {
    return key === 'winProbability' || key === 'totalDays' || key === 'totalBudget';
  }

  getPattern(key: string): string {
    if (key === 'totalBudget') {
      return '^[0-9]+([.,][0-9]{1,2})?$';
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
      this.formData.totalDays = '';
      return;
    }

    if (end < start) {
      this.formData.totalDays = '';
      return;
    }

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

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + Math.floor(totalDays));
    this.formData.endDate = end.toISOString().slice(0, 10);
  }

  private parseIsoDate(value: string | undefined): Date | null {
    if (!value) return null;
    const [y, m, d] = value.split('-').map((v) => Number(v));
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }

  private diffGiorniEsclusivo(start: Date, end: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.floor((end.getTime() - start.getTime()) / msPerDay);
    return diff;
  }

  toId(key: string, i: number): string {
    return `progetto-${i}-${key}`
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
      .replace(/\s+/g, '-')                             
      .replace(/[^a-zA-Z0-9_-]/g, '')                   
      .toLowerCase();
  } //funzione per evitare problemi di caratteri speciali e maiuscole eventuali


}
