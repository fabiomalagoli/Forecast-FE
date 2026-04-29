import { Component, Input, Output, EventEmitter, input, output } from '@angular/core';
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
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-resource-details-grid',
  standalone: true,
  imports: [CommonModule, TextInputComponent, AppButton, FormsModule],
  templateUrl: './resource-details-grid.html',
  styleUrl: './resource-details-grid.css'
})
export class ResourceDetailsGridComponent {
  
  resource = input<ProjectEmployee | null>();
  resourceDetailsHeaders = RISORSE_DETAILS_RECAP_HEADERS;

  salvataggioCompletato = output<ProjectEmployee>();

  primoSemestre = signal([
    { nome: 'Gennaio', giorni: 10, tariffa: 50, conferma: false },
    { nome: 'Febbraio', giorni: 10, tariffa: 70, conferma: false },
    { nome: 'Marzo', giorni: 10, tariffa: 30, conferma: false },
    { nome: 'Aprile', giorni: 10, tariffa: 80, conferma: false },
    { nome: 'Maggio', giorni: 10, tariffa: 10, conferma: false },
    { nome: 'Giugno', giorni: 10, tariffa: 20, conferma: false }
  ]);

  secondoSemestre = signal([
    { nome: 'Luglio', giorni: 10, tariffa: 50, conferma: false },
    { nome: 'Agosto', giorni: 10, tariffa: 70, conferma: false },
    { nome: 'Settembre', giorni: 10, tariffa: 30, conferma: false },
    { nome: 'Ottobre', giorni: 10, tariffa: 80, conferma: false },
    { nome: 'Novembre', giorni: 10, tariffa: 10, conferma: false },
    { nome: 'Dicembre', giorni: 10, tariffa: 20, conferma: false }
  ]);

  isEditMode = signal(false);

  confermato = signal<boolean>(false);
  totaleGiorniOccupati = signal<number>((projectEmployee => projectEmployee ? projectEmployee.daysSpent : 0)(this.resource()));
  tariffaGiornaliera = signal<number>(0);

  toggleEditMode(){
    this.isEditMode.update(value => !value);
  }

  salvaDati(){
    console.log("Salvataggio dati modificati per la risorsa:", this.resource());

    const risorsaAttuale = this.resource();
    if (!risorsaAttuale) {
      console.error("Nessuna risorsa selezionata per il salvataggio.");
      return;
    }

    const totaleGiorni = this.primoSemestre().reduce((acc, mese) => acc + mese.giorni, 0)
     + this.secondoSemestre().reduce((acc, mese) => acc + mese.giorni, 0); 
    // const tariffa = this.mesi().length > 0 ? this.mesi()[0].tariffa : 0;

    const risorsaAggiornata: ProjectEmployee = {
      ...risorsaAttuale,
      daysSpent: totaleGiorni,
    };

    this.salvataggioCompletato.emit(risorsaAggiornata);
    this.toggleEditMode();
  }

  closeDrawer = signal(new EventEmitter<void>());

  chiudi() {
    this.closeDrawer().emit();
  }
}