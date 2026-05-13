import { Component, EventEmitter, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../../../shared/button/button';
import { signal } from '@angular/core';
import { ProjectEmployee } from '../../project-employee.model';
import { TextInputComponent } from "../../../../shared/text-input/text-input";
import { EMPLOYEES_DETAILS_RECAP_HEADERS } from './employee-details-recap.headers';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-resource-details-grid',
  standalone: true,
  imports: [CommonModule, TextInputComponent, AppButtonComponent, FormsModule],
  templateUrl: './employee-details-grid.component.html',
  styleUrl: './employee-details-grid.component.css'
})
export class ResourceDetailsGridComponent {
  
  resource = input<ProjectEmployee | null>();
  resourceDetailsHeaders = EMPLOYEES_DETAILS_RECAP_HEADERS;

  savingComplete = output<ProjectEmployee>();

  firstSemester = signal([
    { name: 'Gennaio', days: 10, tariffs: 50, confirm: false },
    { name: 'Febbraio', days: 10, tariffs: 70, confirm: false },
    { name: 'Marzo', days: 10, tariffs: 30, confirm: false },
    { name: 'Aprile', days: 10, tariffs: 80, confirm: false },
    { name: 'Maggio', days: 10, tariffs: 10, confirm: false },
    { name: 'Giugno', days: 10, tariffs: 20, confirm: false }
  ]);

  secondSemester = signal([
    { name: 'Luglio', days: 10, tariffs: 50, confirm: false },
    { name: 'Agosto', days: 10, tariffs: 70, confirm: false },
    { name: 'Settembre', days: 10, tariffs: 30, confirm: false },
    { name: 'Ottobre', days: 10, tariffs: 80, confirm: false },
    { name: 'Novembre', days: 10, tariffs: 10, confirm: false },
    { name: 'Dicembre', days: 10, tariffs: 20, confirm: false }
  ]);

  isEditMode = signal(false);

  confirmed = signal<boolean>(false);
  totalDaysSpent = signal<number>((projectEmployee => projectEmployee ? projectEmployee.daysSpent : 0)(this.resource()));
  dailyTariff = signal<number>(0);

  toggleEditMode(){
    this.isEditMode.update(value => !value);
  }

  saveData(){
    console.log("Salvataggio dati modificati per la risorsa:", this.resource());

    const actualEmployee = this.resource();
    if (!actualEmployee) {
      console.error("Nessuna risorsa selezionata per il salvataggio.");
      return;
    }

    const totalDays = this.firstSemester().reduce((acc, mese) => acc + mese.days, 0)
     + this.secondSemester().reduce((acc, mese) => acc + mese.days, 0); 
    // const tariffa = this.mesi().length > 0 ? this.mesi()[0].tariffa : 0;

    const updatedEmployee: ProjectEmployee = {
      ...actualEmployee,
      daysSpent: totalDays,
    };

    this.savingComplete.emit(updatedEmployee);
    this.toggleEditMode();
  }

  closeDrawer = signal(new EventEmitter<void>());

  close() {
    this.closeDrawer().emit();
  }
}
