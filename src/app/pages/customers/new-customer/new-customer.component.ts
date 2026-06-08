import { Component, ViewEncapsulation, output, signal } from '@angular/core';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { CUSTOMER_HEADERS } from '../customer/customer.headers';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Customer } from '../../../shared/models/customer.model';
import { toElementId } from '../../../shared/utils/project-form.utils';

@Component({
  selector: 'app-new-customer',
  imports: [FormsModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './new-customer.component.html',
  styleUrls: ['./new-customer.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class NewCustomerComponent {
  readonly headers = (Object.entries(CUSTOMER_HEADERS) as [keyof Customer, string][])
    .filter(([key, label]) => key !== 'id' && label !== 'Progetti Attivi')
    .map(([key, label]) => ({ key, label }));
  created = output<Customer>();
  cancel = output<void>();
  formData: any = {};

  attemptedSubmit = signal(false);

  customerForm!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.initForm();
  }

  private initForm() {
    const formControls: { [key: string]: any } = {};
    
    this.headers.forEach(header => {
      const validators = [Validators.required]
      if (header.key === 'streetNumber') {
        validators.push(Validators.pattern(/^\d+(\/[a-zA-Z]+)?$/));
      } else if (this.isNumericField(header.key)) {
        validators.push(Validators.pattern(/^\d+$/));
      }

      formControls[header.key] = ['', validators];
    });

    this.customerForm = this.fb.group(formControls);
  }

  submit() {
    this.attemptedSubmit.set(true);

    if(this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const createdCustomer = { ...this.customerForm.value } as Customer;
    this.created.emit(createdCustomer);

    this.customerForm.reset();
    this.attemptedSubmit.set(false);
  }

  onCancel() {
    this.cancel.emit();
  }

  onFieldChange() {
    this.attemptedSubmit.set(false);
  }

  //Funzione per evitare problemi di caratteri speciali e maiuscole eventuali.
  toId(key: string, i: number): string {
    return toElementId('customer', key, i);
  }

  isNumericField(key: string): boolean {
    const numericKeys = ['projects', 'postalCode']; 
    return numericKeys.includes(key);
  }
}
