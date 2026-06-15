import { Component, input, output, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { Customer } from '../../../shared/models/customer.model';
import { CustomersService } from '../../../shared/services/customers.service';
import { parseCustomerAddress } from '../../../shared/utils/customer-form.utils';
import { toElementId } from '../../../shared/utils/project-form.utils';
import { CustomerFormFacade } from '../../../shared/utils/customer-form.facade';

@Component({
  selector: 'app-edit-customer',
  standalone: true,
  imports: [CommonModule, TextInputComponent, ReactiveFormsModule],
  templateUrl: './edit-customer.component.html',
  providers: [CustomerFormFacade]
})
export class EditCustomerComponent implements OnInit {
  public facade = inject(CustomerFormFacade);
  private customersService = inject(CustomersService);

  selectedCustomerToEdit = input.required<Customer>();
  modified = output<Customer>();
  cancel = output<void>();

  editCustomerForm!: FormGroup;

  attemptedSubmit = false;
  noChangesMessage = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  isSaving = signal(false);

  private originalDataToCompare: any = {};

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    const customer = this.selectedCustomerToEdit();
    const separateAddress = parseCustomerAddress(customer.fullAddress || '');

    const initialData = {
      ...customer,
      ...separateAddress
    };

    this.originalDataToCompare = { ...initialData };
    
    // Generiamo il form popolato sfruttando il Facade
    this.editCustomerForm = this.facade.buildForm(initialData);
  }

  isChanged(): boolean {
    return this.facade.isChanged(this.editCustomerForm, this.originalDataToCompare);
  }

  get isButtonDisabled(): boolean {
    return this.editCustomerForm.invalid || !this.isChanged() || this.isSaving();
  }

  submit() {
    if (this.isButtonDisabled) return;

    this.isSaving.set(true);
    const updateCustomerData = {
      ...this.originalDataToCompare,
      ...this.editCustomerForm.value
    };

    this.customersService.updateCustomer(updateCustomerData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.attemptedSubmit = false;
        this.noChangesMessage = false;
        this.statusMessage = { text: 'Cliente modificato con successo!', type: 'success' };
        this.modified.emit(updateCustomerData);
      },
      error: (error: any) => {
        this.isSaving.set(false);
        this.attemptedSubmit = true;
        let errorMessage = 'Errore durante la modifica del cliente';
        
        if (error.status === 400) errorMessage = 'Dati non validi. Controlla i campi inseriti.';
        else if (error.status === 404) errorMessage = 'Cliente non trovato.';
        else if (error.status === 500) errorMessage = 'Errore del server. Riprova più tardi.';
        
        this.statusMessage = { text: errorMessage, type: 'error' };
      }
    });
  }

  onSubmitClick(event: Event) {
    if (!this.isChanged()) {
      event.preventDefault();
      this.noChangesMessage = true;
      return;
    } 
    if (this.editCustomerForm.invalid) {
      event.preventDefault();
      this.attemptedSubmit = true;
      this.editCustomerForm.markAllAsTouched();
    }
  }

  onCancel() { this.cancel.emit(); }
  toId(key: string, i: number): string { return toElementId('cliente', key, i); }

  onFieldChange() {
    this.attemptedSubmit = false;
    this.noChangesMessage = false;
    this.statusMessage = null;
  }
}