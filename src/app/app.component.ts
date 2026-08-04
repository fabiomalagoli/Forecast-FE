import { Component, inject, OnInit, signal } from '@angular/core';
import { SidebarComponent } from './header/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthenticationService } from './shared/services/authentication.service';
import { AutoLogoutService } from './shared/services/auto-logout.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SidebarComponent, CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  protected readonly title = signal('Forecast-FE');
  protected readonly authService = inject(AuthenticationService);
  private autoLogoutService = inject(AutoLogoutService);
  private router = inject(Router);

  readonly selectedPage = signal('Home');

  ngOnInit(): void {
    this.autoLogoutService.initInactivityTimer();
  }

  OnSidebarIdSelected(page: string) {
    this.router.navigate([page.toLowerCase()]);
  }
}