import { Component, input, output } from '@angular/core';
import { AppButton } from '../../shared/button/button';
import { Employee } from '../risorse.model';

@Component({
  selector: 'tr[app-risorsa-row]',
  imports: [AppButton],
  templateUrl: './risorsa.html',
  styleUrl: './risorsa.css',
})
export class RisorsaRowComponent {
  risorsa = input.required<Employee>();

  editRisorsa = output<Employee>();
}
