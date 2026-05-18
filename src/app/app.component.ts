import { Component, inject, signal } from '@angular/core';
import { SidebarComponent } from './header/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [SidebarComponent, CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
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
