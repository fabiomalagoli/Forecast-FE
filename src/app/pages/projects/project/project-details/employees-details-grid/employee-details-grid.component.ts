import { Component, computed, EventEmitter, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../../../../shared/button/button';
import { signal } from '@angular/core';
import { Project, ProjectEmployee, RecapData } from '../../../../../shared/models/project.model';
import { TextInputComponent } from "../../../../../shared/text-input/text-input.component";
import { RECAP_DATA_HEADERS } from '../../../recap-data.headers';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MAT_DATE_FORMATS, provideNativeDateAdapter } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MonthlyManagementsService } from '../../../../../shared/services/monthly-managements.service';
import { MonthlyManagementSavePayload, MonthlyResourceDetail, MonthlyManagement } from '../../../../../shared/models/monthly-management.model';
import { buildMonthlyResourceDetails } from '../../../../../shared/utils/monthly-managements.utils';
import { MONTHS_IN_YEAR, YEAR_FORMATS, FIRST_SEMESTER_LENGTH } from '../../../../../shared/constants/monthly-management.constant';
import { SnackbarService } from '../../../../../shared/services/snackbar.service';
import { NotifyAction } from '../../../../../shared/enums/notify.enum';
import { ProjectsService } from '../../../../../shared/services/projects.service';

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
  private projectService = inject(ProjectsService);
  private monthlyManagementsCache = new Map<string, MonthlyManagement[]>();
  private latestMonthlyManagementsRequestKey: string | null = null;
  private snackbarService = inject(SnackbarService);
 
  resource = input<ProjectEmployee | null>();
  project = input<Project | null>()

  recapData = signal<RecapData | null>(null);

  recapDataHeaders = RECAP_DATA_HEADERS;

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

  allMonths = [...this.firstSemester(), ...this.secondSemester()];

  isEditMode = signal(false);

  confirmed = signal<boolean>(false);
  totalDaysSpent = signal<number>((projectEmployee => projectEmployee ? projectEmployee.daysSpent : 0)(this.resource()));
  dailyTariff = signal<number>(0);

  closeDrawer = signal(new EventEmitter<void>());
  
  totalDaysEntered = signal(0);

  snapshotTotalDaysEntered = signal(0);

  deltaDaysFromSnapshot = computed<number>(() => {
    return this.totalDaysEntered() - this.snapshotTotalDaysEntered(); //totalDaysEntered farà da offset fra i giorni complessivi già presenti e i giorni aggiunti DELLA GRIGLIA
                                                                      //Basta farlo anche per uno solo degli anni, dal momento che possiamo editarne solo uno alla volta
  });

  remainingDays = computed<number>(() => Math.max(0, ((this.resource()?.daysSpent ?? 0) - this.totalDaysEntered())));

  formattedRemainingDays = computed(() => this.formatDecimal(this.remainingDays()));

  totaleConsuntivate = computed(() => {
    const backendValue = this.recapData()?.totalEmployedDays ?? 0;
    if (this.isEditMode()) {
      return this.formatDecimal(backendValue + this.deltaDaysFromSnapshot(), true);
    }
    return this.formatDecimal(backendValue, true);
  });

  isTotalExceeded = computed<boolean>(() => {
    return (this.totalDaysEntered() > (this.resource()?.daysSpent ?? 0));
  })

  budgetTotale = computed(() => {
    const valore = this.recapData()?.budgetTotaleRisorsa ?? 0;
    return this.formatDecimal(valore, true);
  });

  totaleRicavi = computed(() => {
    const backendValue = this.recapData()?.totalRevenues ?? 0;
    if (this.isEditMode()) {
      const dailyCost = this.resource()?.dailyCost ?? 0;
      return this.formatDecimal(backendValue + (this.deltaDaysFromSnapshot() * dailyCost), true);
    }
    return this.formatDecimal(backendValue, true);
  });

  budgetWin = computed(() => {
    const valore = this.recapData()?.budgetWin ?? 0;
    return this.formatDecimal(valore, true);
  });

  deltaValue = computed(() => {
    const backendValue = this.recapData()?.delta ?? 0;
    if (this.isEditMode()) {
      return backendValue - this.deltaDaysFromSnapshot();
    }
    return backendValue;
  });

  delta = computed(() => this.formatDecimal(this.deltaValue()));

  formattedDailyTariff = computed(() => this.formatDecimal(this.resource()?.dailyCost, true));

  private getMonthlyManagementsCacheKey(projectEmployeeId: string, year: number) {
    return `${projectEmployeeId}_${year}`;
  }

  loadRecapData() {
    const projectId = this.project()?.id;
    const resourceId = this.resource()?.id;
    if (!projectId || !resourceId) {
      return;
    }
    this.projectService.loadProjectEmployeeRecapData(projectId, resourceId).subscribe({
      next: (data) => {
        console.log('Dati di recap caricati con successo dal backend:', data);
        this.recapData.set(data);
      },
      error: (err) => {
        console.error(err);
        this.snackbarService.error(NotifyAction.Caricamento, 'Dati di recap', 'Riprova')
        .onAction().subscribe(() => {
          this.loadRecapData();
        })
      }
    });
  }

  initForm() {
    const formControls: { [key: string]: FormControl } = {};
    const formValues = this.buildMonthlyFormValues();

    Object.keys(formValues).forEach(controlName => {
      if(controlName.includes('_days')){
        formControls[controlName] = new FormControl(
          formValues[controlName], 
          [this.dayValueValidator]
        );
      } else formControls[controlName] = new FormControl(formValues[controlName]);
    });

    this.editMonthlyManagementsForm = this.fb.group(formControls);
    this.setMonthlyFormEnabled(this.isEditMode());

    this.editMonthlyManagementsForm.valueChanges.subscribe(() => {
      this.calculateTotalDaysEntered();
    })
  }

  private calculateTotalDaysEntered() {
    let sumMonthDays = 0;
    this.allMonths.forEach(monthDetail => {
      sumMonthDays += this.parseDayValue(this.editMonthlyManagementsForm.get(`month_${monthDetail.month}_days`)?.value);
    });
    this.totalDaysEntered.set(this.roundDayValue(sumMonthDays));
  }

  private buildMonthlyFormValues() {
    const formValues: { [key: string]: string | boolean } = {};

    const monthlyManagements = this.monthlyManagements();

    this.allMonths.forEach(monthDetail => {
      const savedMonth = monthlyManagements.find(monthlyManagement => monthlyManagement.month === monthDetail.month);

      formValues[`month_${monthDetail.month}_days`] = this.formatDecimal(savedMonth?.days ?? monthDetail.days); // Se esiste un dato salvato per questo mese, usalo; altrimenti, usa il valore di default
      formValues[`month_${monthDetail.month}_confirm`] = savedMonth?.isConfirmed ?? monthDetail.confirm;
    });

    return formValues;
  }

  private updateMonthlyManagementsForm() { // Questa funzione aggiorna i valori del form con i dati correnti dei monthly managements, mantenendo abilitazione/disabilitazione attuale
    const formValues = this.buildMonthlyFormValues();
    this.editMonthlyManagementsForm.reset(formValues, { emitEvent: false });
    this.calculateTotalDaysEntered();
    this.setMonthlyFormEnabled(this.isEditMode());
    console.log("Valori applicati alla griglia mensile:", this.editMonthlyManagementsForm.getRawValue());
  }

  ngOnInit() {
    this.loadRecapData();
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

    this.monthlyManagementsService.loadMonthsForEmployee(actualEmployee.id, selectedYear).subscribe({
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
      
      // Quando entro in edit mode, salvo lo snapshot dei giorni attuali della griglia
      if (nextValue) {
        this.snapshotTotalDaysEntered.set(this.totalDaysEntered());
      }
      
      this.setMonthlyFormEnabled(nextValue);
      return nextValue;
    });
  }

  private setMonthlyFormEnabled(enabled: boolean) {
    if (!this.editMonthlyManagementsForm) {
      return;
    }

    if (enabled) {
      this.editMonthlyManagementsForm.enable({ emitEvent: false });
      return;
    }

    this.editMonthlyManagementsForm.disable({ emitEvent: false });
  }

  onWheel(event: WheelEvent){
    event.preventDefault();
    (event.target as HTMLElement | null)?.blur();
  }

  normalizeDayControl(controlName: string) {
    const control = this.editMonthlyManagementsForm.get(controlName);
    if (!control) {
      return;
    }

    if (control.invalid) {
      return;
    }

    const normalizedValue = this.roundDayValue(this.parseDayValue(control.value));
    control.setValue(this.formatDecimal(normalizedValue));
  }

  saveData(){ // Questa funzione viene chiamata quando l'utente clicca sul pulsante di salvataggio. Prepara i dati da salvare e chiama il servizio per inviarli al backend
    console.log("Salvataggio dati modificati per la risorsa:", this.resource());

    if(this.editMonthlyManagementsForm.invalid){
      this.snackbarService.error(NotifyAction.Salvataggio, 'dati annuali', 'Chiudi');
      return;
    }

    this.normalizeAllDayControls();

    const actualEmployee = this.resource();
    if (!actualEmployee) {
      console.error("Nessuna risorsa selezionata per il salvataggio.");
      return;
    }

    const monthsToSave: MonthlyManagementSavePayload[] = this.allMonths.map(monthDetail => ({
      month: monthDetail.month,
      days: this.roundDayValue(this.parseDayValue(this.editMonthlyManagementsForm.get(`month_${monthDetail.month}_days`)?.value)),
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

    this.monthlyManagementsService.safeMonthsForEmployee(actualEmployee.id, selectedYear, monthsToSave).subscribe({
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
        this.loadRecapData();
      },
      error: (error) => {
        console.error("Errore durante il salvataggio dei dati:", error);
      }
    });

  }

  close() {
    this.closeDrawer().emit(); // Emissione dell'evento per chiudere il drawer
  }

  private formatDecimal(value: number | null | undefined, isMonetary = false): string {
    if (value == null || isNaN(Number(value))) {
      value = 0;
    }
    const standardString = Number(value).toFixed(2);
    const parts = standardString.split('.');
    
    // Applica il punto delle migliaia solo se richiesto
    if (isMonetary) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    
    return parts.join(',');
  }

  private parseDayValue(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const normalized = String(value ?? '').trim().replace(',', '.');
    if (!normalized) {
      return 0;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private roundDayValue(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private normalizeAllDayControls() {
    this.allMonths.forEach(monthDetail => {
      this.normalizeDayControl(`month_${monthDetail.month}_days`);
    });
  }

  private dayValueValidator(control: AbstractControl): ValidationErrors | null {
    const normalized = String(control.value ?? '').trim().replace(',', '.');
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      return { number: true };
    }

    if (parsed < 0) {
      return { min: true };
    }

    return null;
  }
}
