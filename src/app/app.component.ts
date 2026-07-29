import { Component, inject, signal } from '@angular/core';
import { SidebarComponent } from './header/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthenticationService } from './shared/services/authentication.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SidebarComponent, CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  protected readonly title = signal('Forecast-FE');
  protected readonly authService = inject(AuthenticationService); // Esposto per il template
  private router = inject(Router);

  readonly selectedPage = signal('Home');

  OnSidebarIdSelected(page: string) {
    this.router.navigate([page.toLowerCase()]);
  }
}