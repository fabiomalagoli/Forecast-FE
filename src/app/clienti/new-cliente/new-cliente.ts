import { Component, output } from '@angular/core';
import { TextInputComponent } from '../../shared/text-input/text-input';
import { CLIENTE_HEADERS } from '../cliente/cliente.headers';
import { Cliente } from '../cliente/cliente';
import { FormsModule, NgForm } from '@angular/forms';
import { ModelloCliente } from '../cliente/cliente.model';

@Component({
  selector: 'app-new-cliente',
  imports: [FormsModule, TextInputComponent],
  templateUrl: './new-cliente.html',
  styleUrl: './new-cliente.css',
})
export class NewCliente {
  readonly headers = (Object.entries(CLIENTE_HEADERS) as [keyof ModelloCliente, string][]).map(
    ([key, label]) => ({ key, label }),
  );
  created = output<ModelloCliente>();
  cancel = output<void>();
  formData: any = {};

  submit(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    const clienteCreato = { ...this.formData } as ModelloCliente;
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
}
