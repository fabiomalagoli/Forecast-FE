import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Progetto } from '../../progetti/progetto/progetto.model';
import { TextInputComponent } from "../../shared/text-input/text-input";
import { Progetti } from '../progetti';
import { Column } from '../../shared/table-row/table.types';
import { PROGETTO_HEADERS } from '../progetto/progetto.headers';

@Component({
  selector: 'app-new-progetto',
  standalone: true,
  imports: [FormsModule, CommonModule, TextInputComponent],
  templateUrl: './new-progetto.html',
  styleUrl: './new-progetto.css',
})

export class NewProgettoComponent {

  readonly headers = (Object.entries(PROGETTO_HEADERS) as [keyof Progetto, string][])
  .map(([key, label]) => ({ key, label }));

  created = output<Progetto>();

  cancel = output<void>();

  formData: any = {};

  submit(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
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

  toId(key: string, i: number): string {
    return `progetto-${i}-${key}`
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
      .replace(/\s+/g, '-')                             
      .replace(/[^a-zA-Z0-9_-]/g, '')                   
      .toLowerCase();
  } //funzione per evitare probelmi di caratteri speciali e maiuscole eventuali


}
