import { Component, inject, input, Input, signal } from '@angular/core';
import { Header } from './header/header'
import { Grid } from './grid/grid';
import { Progetti } from './progetti/progetti';
import { Clienti } from './clienti/clienti';
import { Sidebar } from './header/sidebar/sidebar';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [Sidebar, CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Forecast-FE');
  // Router usato per navigare programmaticamente (es. dopo azioni utente)
  private router = inject(Router);
  // @Input({required: true}) selectedPage: string = 'Home';
  readonly selectedPage = signal('Home');

  OnSidebarIdSelected(page: string) {
    this.router.navigate([page.toLowerCase()]);
  }



}
