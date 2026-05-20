import { Component, EventEmitter, input, output, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AppButtonComponent } from '../../../../../shared/button/button';
import { signal } from '@angular/core';
import { ProjectEmployee } from '../../../../../shared/models/project.model';
import { TextInputComponent } from "../../../../../shared/text-input/text-input.component";
import { EMPLOYEES_DETAILS_RECAP_HEADERS } from './employee-details-recap.headers';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from "@angular/material/select";
import { MAT_DATE_FORMATS, provideNativeDateAdapter } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';

export const YEAR_FORMATS = {
  parse: {
    dateInput: { year: 'numeric' }
  },
  display: {
    dateInput: { year: 'numeric' },
    monthYearLabel: { year: 'numeric' },
    dateA11yLabel: { year: 'numeric' },
    monthYearA11yLabel: { year: 'numeric' },
  },
}

@Component({
  selector: 'app-resource-details-grid',
  standalone: true,
  imports: [
    CommonModule,
    TextInputComponent,
    AppButtonComponent,
    FormsModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  providers: [provideNativeDateAdapter(),
    {provide: MAT_DATE_FORMATS, useValue: YEAR_FORMATS }
  ],
  templateUrl: './employee-details-grid.component.html',
  styleUrl: './employee-details-grid.component.scss',
})
export class ResourceDetailsGridComponent {
  
  resource = input<ProjectEmployee | null>();
  resourceDetailsHeaders = EMPLOYEES_DETAILS_RECAP_HEADERS;

  savingComplete = output<ProjectEmployee>();

  yearSelected = new FormControl(new Date());

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

  chosenYearHandler(normalizedYear: Date, datepicker: any) {
    this.yearSelected.setValue(normalizedYear);
    datepicker.close();
  }

  changeYear(offset: number){
    const currentZone = this.yearSelected.value;
    if(currentZone) {
      const newDate = new Date(currentZone);
      newDate.setFullYear(newDate.getFullYear() + offset);
      this.yearSelected.setValue(newDate);
    }
  }

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
