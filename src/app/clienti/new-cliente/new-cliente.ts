import { Component, output } from '@angular/core';
import { TextInputComponent } from '../../shared/text-input/text-input';
import { CLIENTE_HEADERS } from '../cliente/cliente.headers';
import { FormsModule, NgForm } from '@angular/forms';
import { Cliente } from '../cliente/cliente.model';

@Component({
  selector: 'app-new-cliente',
  imports: [FormsModule, TextInputComponent],
  templateUrl: './new-cliente.html',
  styleUrls: ['./new-cliente.css', '../../shared/cliente-form.css'],
})
export class NewClienteComponent {
  readonly headers = (Object.entries(CLIENTE_HEADERS) as [keyof Cliente, string][])
    .filter(([key]) => key !== 'id')
    .map(([key, label]) => ({ key, label }));
  created = output<Cliente>();
  cancel = output<void>();
  formData: any = {};

  submit(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    // const totalDays = Number(this.formData.totalDays);
    // if (isNaN(totalDays)) {
    //   console.error('Il campo totalDays deve essere un numero.');
    //   return;
    // }

    const clienteCreato = { ...this.formData } as Cliente;
    this.created.emit(clienteCreato);
    form.resetForm();
    this.formData = {};
  }

  onCancel() {
    this.cancel.emit();
  }

  //Funzione per evitare problemi di caratteri speciali e maiuscole eventuali.
  toId(key: string, i: number): string {
    return `cliente-${i}-${key}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase();
  }

  isNumericField(key: string): boolean {
    return key === 'projects';
  }
}
