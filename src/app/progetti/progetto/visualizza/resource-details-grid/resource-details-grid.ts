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
  imports: [CommonModule, TextInputComponent, AppButton],
  templateUrl: './resource-details-grid.html',
  styleUrl: './resource-details-grid.css'
})
export class ResourceDetailsGridComponent {
  
  resource = input<ProjectEmployee | null>();
  resourceDetailsHeaders = RISORSE_DETAILS_RECAP_HEADERS;

  isEditMode = signal(false);

  toggleEditMode(){
    if(this.isEditMode()){
      this.salvaDati();
    }

    this.isEditMode.update(value => !value);
  }

  salvaDati(){
    console.log("Salvataggio dati modificati per la risorsa:", this.resource());
    this.annullaModifica();
  }

  annullaModifica(){
    this.isEditMode.set(false);
  }

  closeDrawer = signal(new EventEmitter<void>());

  chiudi() {
    this.closeDrawer().emit();
  }
}