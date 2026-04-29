import { Component, Input, Output, EventEmitter, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Progetto } from '../../progetto.model';
import { PROGETTO_COMPLETO_HEADERS } from '../../progetto-completo.headers';
import { AppButton } from '../../../../shared/button/button';
import { inject, signal } from '@angular/core';
import { RequestsService } from '../../../../shared/requests.service';
import { Progetti } from '../../../progetti';
import { ProjectEmployee } from '../../progetto-employee.model';
import { TextInputComponent } from "../../../../shared/text-input/text-input";
import { ResourceDetailsRecap } from './resource-details-recap.model';
import { RISORSE_DETAILS_RECAP_HEADERS } from './resource-details-recap.headers';

@Component({
  selector: 'app-resource-details-grid',
  standalone: true,
  imports: [CommonModule, TextInputComponent],
  templateUrl: './resource-details-grid.html',
  styleUrl: './resource-details-grid.css' // Se usi SCSS, cambia l'estensione qui
})
export class ResourceDetailsGridComponent {
  
  // @Input permette a questo componente di ricevere i dati dal componente padre
  // Sostituisci 'any' con l'interfaccia corretta se ce l'hai (es. Employee)
  resource = input<ProjectEmployee | null>();
  resourceDetailsHeaders = RISORSE_DETAILS_RECAP_HEADERS;

  // @Output permette al drawer di comunicare al padre che deve essere chiuso
  closeDrawer = signal(new EventEmitter<void>());

  // Funzione da collegare alla "X" o al tasto "Chiudi" nel tuo file .html
  chiudi() {
    this.closeDrawer().emit();
  }
}