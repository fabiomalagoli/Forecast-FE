import { Component, EventEmitter, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../../../../shared/button/button';
import { signal } from '@angular/core';
import { ProjectEmployee } from '../../../../../shared/models/project.model';
import { TextInputComponent } from "../../../../../shared/text-input/text-input.component";
import { EMPLOYEES_DETAILS_RECAP_HEADERS } from './employee-details-recap.headers';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MAT_DATE_FORMATS, provideNativeDateAdapter } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MonthlyManagementsService } from '../../../../../shared/services/monthly-managements.service';
import { MonthlyManagementSavePayload, MonthlyResourceDetail, MonthlyManagement } from '../../../../../shared/models/monthly-management.model';
import { buildMonthlyResourceDetails } from '../../../../../shared/utils/monthly-managements.utils';
import { MONTHS_IN_YEAR, YEAR_FORMATS, FIRST_SEMESTER_LENGTH } from '../../../../../shared/enums/monthly-management.enums';

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

  private fb = inject(FormBuilder);
  private monthlyManagementsService = inject(MonthlyManagementsService);
  private monthlyManagementsCache = new Map<string, MonthlyManagement[]>();
  private latestMonthlyManagementsRequestKey: string | null = null;
 
  resource = input<ProjectEmployee | null>();
  resourceDetailsHeaders = EMPLOYEES_DETAILS_RECAP_HEADERS;

  monthlyManagements = signal<MonthlyManagement[]>([]);

  editMonthlyManagementsForm!: FormGroup;

  savingComplete = output<ProjectEmployee>();

  yearSelected = new FormControl(new Date());

  firstSemester = signal<MonthlyResourceDetail[]>(
    buildMonthlyResourceDetails(1, FIRST_SEMESTER_LENGTH)
  );

  secondSemester = signal<MonthlyResourceDetail[]>(
    buildMonthlyResourceDetails(FIRST_SEMESTER_LENGTH + 1, MONTHS_IN_YEAR - FIRST_SEMESTER_LENGTH)
  );

  isEditMode = signal(false);

  confirmed = signal<boolean>(false);
  totalDaysSpent = signal<number>((projectEmployee => projectEmployee ? projectEmployee.daysSpent : 0)(this.resource()));
  dailyTariff = signal<number>(0);

  closeDrawer = signal(new EventEmitter<void>());

  private getMonthlyManagementsCacheKey(projectEmployeeId: string, year: number) { // Questa funzione genera una chiave univoca per la cache dei monthly managements in base all'Id del dipendente e all'anno
    return `${projectEmployeeId}_${year}`;
  }

  initForm() {
    const formControls: { [key: string]: FormControl } = {};
    const formValues = this.buildMonthlyFormValues();

    Object.keys(formValues).forEach(controlName => {
      formControls[controlName] = new FormControl(formValues[controlName]);
    });

    this.editMonthlyManagementsForm = this.fb.group(formControls);
    this.setMonthlyFormEnabled(this.isEditMode());
  }

  private buildMonthlyFormValues() {
    const formValues: { [key: string]: number | boolean } = {};

    const monthlyManagements = this.monthlyManagements();
    const allMonths = [...this.firstSemester(), ...this.secondSemester()];

    allMonths.forEach(monthDetail => {
      const savedMonth = monthlyManagements.find(monthlyManagement => monthlyManagement.month === monthDetail.month);

      formValues[`month_${monthDetail.month}_days`] = savedMonth?.days ?? monthDetail.days; // Se esiste un dato salvato per questo mese, usalo; altrimenti, usa il valore di default
      formValues[`month_${monthDetail.month}_confirm`] = savedMonth?.isConfirmed ?? monthDetail.confirm;
    });

    return formValues;
  }

  private updateMonthlyManagementsForm() { // Questa funzione aggiorna i valori del form con i dati correnti dei monthly managements, mantenendo abilitazione/disabilitazione attuale
    const formValues = this.buildMonthlyFormValues();
    this.editMonthlyManagementsForm.reset(formValues, { emitEvent: false });
    this.setMonthlyFormEnabled(this.isEditMode());
    console.log("Valori applicati alla griglia mensile:", this.editMonthlyManagementsForm.getRawValue());
  }

  ngOnInit() {
    this.initForm();
    this.loadMonthlyManagementsForSelectedYear();
  }

  chosenYearHandler(normalizedYear: Date, datepicker: any) { // Questa funzione viene chiamata quando l'utente seleziona un anno dal datepicker
    this.yearSelected.setValue(normalizedYear);
    datepicker.close();
    this.loadMonthlyManagementsForSelectedYear();
  }

  changeYear(offset: number){ // Questa funzione viene chiamata quando l'utente clicca sui pulsanti per cambiare anno
    const currentZone = this.yearSelected.value;
    if(currentZone) {
      const newDate = new Date(currentZone);
      newDate.setFullYear((newDate.getFullYear()) + offset);
      this.yearSelected.setValue(newDate);
      this.loadMonthlyManagementsForSelectedYear();
    }
  }

  private loadMonthlyManagementsForSelectedYear() { // Questa funzione carica i dati mensili dal backend in base all'anno selezionato e alla risorsa attuale
    const actualEmployee = this.resource();
    const selectedYear = this.yearSelected.value?.getFullYear();

    if (!actualEmployee || selectedYear == null) {
      return;
    }

    const requestKey = this.getMonthlyManagementsCacheKey(actualEmployee.id, selectedYear);
    this.latestMonthlyManagementsRequestKey = requestKey;

    this.monthlyManagementsService.caricaMonthsForEmployee(actualEmployee.id, selectedYear).subscribe({
      next: (monthlyManagements) => {
        if (this.latestMonthlyManagementsRequestKey !== requestKey) {
          return;
        }

        if (monthlyManagements.length === 0) {
          const cachedMonthlyManagements = this.monthlyManagementsCache.get(requestKey) ?? []; // Controlla se abbiamo dati in cache per questa chiave

          if (cachedMonthlyManagements.length > 0) {
            console.warn(`Nessun dato mensile restituito dal backend per il ${selectedYear}. Uso i dati gia caricati in memoria.`); // Se abbiamo dati in cache, usali invece di mostrare una griglia vuota
            this.monthlyManagements.set(cachedMonthlyManagements);
            this.updateMonthlyManagementsForm();
            return;
          }

          console.warn(`Nessun dato mensile trovato per il ${selectedYear}. La griglia verra inizializzata con valori a 0.`);
        }

        this.monthlyManagementsCache.set(requestKey, monthlyManagements); // Salva i dati ricevuti in cache per eventuali utilizzi in futuro
        this.monthlyManagements.set(monthlyManagements);
        console.log("Dipendente:", actualEmployee, "Anno:", selectedYear, "Dati mensili caricati con successo:", monthlyManagements);
        this.updateMonthlyManagementsForm();
      },
      error: (error) => console.error("Errore durante il caricamento dei dati mensili:", error),
    });
  }

  toggleEditMode(){
    this.isEditMode.update(value => {
      const nextValue = !value;
      this.setMonthlyFormEnabled(nextValue);
      return nextValue;
    });
  }

  private setMonthlyFormEnabled(enabled: boolean) { // Questa funzione abilita o disabilita il form dei monthly managements in base al parametro passato
    if (!this.editMonthlyManagementsForm) {
      return;
    }

    if (enabled) {
      this.editMonthlyManagementsForm.enable({ emitEvent: false });
      return;
    }

    this.editMonthlyManagementsForm.disable({ emitEvent: false });
  }

  saveData(){ // Questa funzione viene chiamata quando l'utente clicca sul pulsante di salvataggio. Prepara i dati da salvare e chiama il servizio per inviarli al backend
    console.log("Salvataggio dati modificati per la risorsa:", this.resource());

    const actualEmployee = this.resource();
    if (!actualEmployee) {
      console.error("Nessuna risorsa selezionata per il salvataggio.");
      return;
    }

    const allMonths = [...this.firstSemester(), ...this.secondSemester()];
    const monthsToSave: MonthlyManagementSavePayload[] = allMonths.map(monthDetail => ({
      month: monthDetail.month,
      days: Number(this.editMonthlyManagementsForm.get(`month_${monthDetail.month}_days`)?.value ?? 0),
      isConfirmed: Boolean(this.editMonthlyManagementsForm.get(`month_${monthDetail.month}_confirm`)?.value),
    }));

    const totalDays = monthsToSave.reduce((acc, monthDetail) => acc + monthDetail.days, 0);

     const updatedEmployee: ProjectEmployee = {
      ...actualEmployee,
      daysSpent: totalDays
    };

    const selectedYear = this.yearSelected.value?.getFullYear();
    if (selectedYear == null) {
      console.error("Nessun anno selezionato per il salvataggio.");
      return;
    }

    this.monthlyManagementsService.salvaMonthsForEmployee(actualEmployee.id, selectedYear, monthsToSave).subscribe({
      next: () => {
        const savedMonthlyManagements: MonthlyManagement[] = monthsToSave.map(month => ({
          id: '',
          year: selectedYear,
          projectEmployeeId: actualEmployee.id,
          ...month,
        })); // Costruiamo un array di MonthlyManagement basato sui dati appena salvati, da usare per aggiornare la cache e lo stato locale

        const cacheKey = this.getMonthlyManagementsCacheKey(actualEmployee.id, selectedYear);
        this.monthlyManagementsCache.set(cacheKey, savedMonthlyManagements);
        this.monthlyManagements.set(savedMonthlyManagements);
        this.savingComplete.emit(updatedEmployee);
        this.toggleEditMode();
      },
      error: (error) => {
        console.error("Errore durante il salvataggio dei dati:", error);
      }
    });
  }

  close() {
    this.closeDrawer().emit(); // Emissione dell'evento per chiudere il drawer
  }
}
