import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progetto',
  imports: [],
  templateUrl: './progetto.html',
  styleUrl: './progetto.css',
  host: {
    '[class.cell-right]': 'align === "right"', //classe per allineamento a destra
    '[class.cell-center]': 'align === "center"', //classe per allineamneto a sinistra
  },
})
export class ProgettoComponent {
  @Input() align: 'left' | 'center' | 'right' = 'left' //allineamento di default a sinistra
}
