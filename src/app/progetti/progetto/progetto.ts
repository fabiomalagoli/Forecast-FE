import { Component, Input } from '@angular/core';
import { Progetto } from './progetto.model';
import { Column } from '../../shared/table-row/table.types';
import { TableRowComponent } from "../../shared/table-row/table-row";

@Component({
  selector: 'app-progetto',
  imports: [TableRowComponent],
  templateUrl: './progetto.html',
  styleUrl: './progetto.css',
  host: {
    '[class.cell-right]': 'align === "right"', //classe per allineamento a destra
    '[class.cell-center]': 'align === "center"', //classe per allineamneto al centro
  },
})
export class ProgettoComponent {

  @Input({required: true}) progetto!: Progetto;
  @Input() align: 'left' | 'center' | 'right' = 'left' //allineamento di default a sinistra
  @Input({required: true}) columns!: Column<Progetto>[];


    readonly PROGETTO_HEADERS: Record<keyof Progetto, string> = {
    Attività: 'Attività',
    Descrizione: 'Descrizione',
    Status: 'Stato',
    Cliente: 'Cliente',
    Referente: 'Referente',
    Azienda: 'Azienda',
    PM: 'Project Manager',
    Giorni: 'Giorni',
    winPercentual: 'Win %',
    }; // Record per inserire i titoli (headers) dei dati della tabella Progetti corrispondenti ai parametri del tipo Progetto

    get colsCount(): number {
      return this.columns.length;
  }

}
