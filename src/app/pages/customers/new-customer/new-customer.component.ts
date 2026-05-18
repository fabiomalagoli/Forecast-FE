import { Component, ViewEncapsulation, output } from '@angular/core';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { CUSTOMER_HEADERS } from '../customer/customer.headers';
import { FormsModule, NgForm } from '@angular/forms';
import { Customer } from '../../../shared/models/customer.model';
import { toElementId } from '../../../shared/utils/project-form.utils';

@Component({
  selector: 'app-new-customer',
  imports: [FormsModule, TextInputComponent],
  templateUrl: './new-customer.component.html',
  styleUrls: ['../../../shared/form-styles.scss'],
  encapsulation: ViewEncapsulation.None
})
export class NewCustomerComponent {
  readonly headers = (Object.entries(CUSTOMER_HEADERS) as [keyof Customer, string][])
    .filter(([key]) => key !== 'id')
    .map(([key, label]) => ({ key, label }));
  created = output<Customer>();
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

    const createdCustomer = { ...this.formData } as Customer;
    this.created.emit(createdCustomer);
    form.resetForm();
    this.formData = {};
  }

  onCancel() {
    this.cancel.emit();
  }

  //Funzione per evitare problemi di caratteri speciali e maiuscole eventuali.
  toId(key: string, i: number): string {
    return toElementId('customer', key, i);
  }

  isNumericField(key: string): boolean {
    return key === 'projects';
  }
}
