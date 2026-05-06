import { Component, inject, input, Input, signal } from '@angular/core';
import { HeaderComponent } from './header/header'
import { GridComponent } from './grid/grid';
import { ProgettiComponent } from './progetti/progetti';
import { ClientiComponent } from './clienti/clienti';
import { SidebarComponent } from './header/sidebar/sidebar';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [SidebarComponent, CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  protected readonly title = signal('Forecast-FE');
  // Router usato per navigare programmaticamente (es. dopo azioni utente)
  private router = inject(Router);
  // @Input({required: true}) selectedPage: string = 'Home';
  readonly selectedPage = signal('Home');

  OnSidebarIdSelected(page: string) {
    this.router.navigate([page.toLowerCase()]);
  }



}
