import { inject, Injectable, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Customer } from '../models/customer.model';
import { CUSTOMER_HEADERS } from '../../pages/customers/customer/customer.headers';

@Injectable()
export class CustomerFormFacade {
  private fb = inject(FormBuilder);

  // Headers dinamici condivisi
  readonly headers = (Object.entries(CUSTOMER_HEADERS) as [keyof Customer, string][])
    .filter(([key, label]) => key !== 'id' && label !== 'Progetti Attivi')
    .map(([key, label]) => ({ key, label }));

  private readonly limits: Record<string, number> = {
    vatNumber: 20,
    name: 60,
    address: 200,
    streetNumber: 10,
    postalCode: 10,
    city: 60,
    province: 10,
    country: 60
  };

  buildForm(initialValues: Record<string, any> = {}): FormGroup {
    const formControls: { [key: string]: any } = {};

    this.headers.forEach(header => {
      const key = header.key;
      const initialValue = initialValues[key] || '';
      const validators = this.isRequiredField(key) ? [Validators.required] : [];

      const maxLength = this.getMaxLength(key);
      if (maxLength) {
        validators.push(Validators.maxLength(maxLength));
      }

      if (key === 'streetNumber') {
        validators.push(Validators.pattern(/^\d+(\/[a-zA-Z]+)?$/));
      } else if (this.isNumericField(key)) {
        validators.push(Validators.pattern(/^\d+$/));
      }

      formControls[key] = [initialValue, validators];
    });

    return this.fb.group(formControls);
  }

  isNumericField(key: string): boolean {
    return ['projects', 'postalCode'].includes(key);
  }

  isRequiredField(key: string): boolean {
    return key === 'vatNumber' || key === 'name';
  }

  getMaxLength(key: string): number | null {
    return this.limits[key] || null;
  }

  isChanged(form: FormGroup, originalData: any): boolean {
    if (!form || !originalData) return false;
    const currentValues = form.getRawValue();

    for (const key of Object.keys(currentValues)) {
      const currentValue = currentValues[key] == null ? '' : String(currentValues[key]).trim();
      const originalValue = originalData[key] == null ? '' : String(originalData[key]).trim();
      
      if (currentValue !== originalValue) {
        return true; 
      }
    }
    return false;
  }

  getRequiredErrorMessage(key: string): string {
    const messages: Record<string, string> = {
      vatNumber: 'Partita IVA obbligatoria',
      name: 'Nome obbligatorio'
    };
    return messages[key] || 'Campo obbligatorio';
  }

  getMaxLengthErrorMessage(key: string): string {
    const maxLength = this.getMaxLength(key);
    if (!maxLength) return 'Lunghezza massima superata';
    
    const messages: Record<string, string> = {
      vatNumber: `Massimo ${maxLength} caratteri per Partita IVA`,
      name: `Massimo ${maxLength} caratteri per Nome`,
      address: `Massimo ${maxLength} caratteri per Indirizzo`,
      streetNumber: `Massimo ${maxLength} caratteri per Civico`,
      postalCode: `Massimo ${maxLength} caratteri per CAP`,
      city: `Massimo ${maxLength} caratteri per Città`,
      province: `Massimo ${maxLength} caratteri per Provincia`,
      country: `Massimo ${maxLength} caratteri per Paese`
    };
    return messages[key] || `Massimo ${maxLength} caratteri`;
  }
}