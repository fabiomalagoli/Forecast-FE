import { Component, ViewEncapsulation, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { Customer } from '../../../shared/models/customer.model';
import { toElementId } from '../../../shared/utils/project-form.utils';
import { CustomerFormFacade } from '../../../shared/utils/customer-form.facade';

@Component({
  selector: 'app-new-customer',
  standalone: true,
  imports: [CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './new-customer.component.html',
  styleUrls: ['./new-customer.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [CustomerFormFacade]
})
export class NewCustomerComponent {
  public facade = inject(CustomerFormFacade);

  created = output<Customer>();
  cancel = output<void>();

  customerForm: FormGroup;
  attemptedSubmit = signal(false);

  constructor() {
    // Generiamo il form reattivo direttamente tramite il Facade
    this.customerForm = this.facade.buildForm();
  }

  submit() {
    this.attemptedSubmit.set(true);

    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const createdCustomer = { ...this.customerForm.value } as Customer;
    this.created.emit(createdCustomer);

    this.customerForm.reset();
    this.attemptedSubmit.set(false);
  }

  onCancel() { this.cancel.emit(); }
  onFieldChange() { this.attemptedSubmit.set(false); }
  toId(key: string, i: number): string { return toElementId('customer', key, i); }
}