import { Component, input, output } from '@angular/core';
import { AppButtonComponent } from '../../shared/button/button';
import { Employee } from '../risorse.model';

@Component({
  selector: 'tr[app-risorsa-row]',
  imports: [AppButtonComponent],
  templateUrl: './risorsa.html',
  styleUrl: './risorsa.css',
})
export class RisorsaRowComponent {
  risorsa = input.required<Employee>();

  viewRisorsa = output<Employee>();
  editRisorsa = output<Employee>();
}
