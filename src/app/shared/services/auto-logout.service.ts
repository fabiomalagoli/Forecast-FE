import { Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AutoLogoutService {
  private readonly authService = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  private timeoutId: any;
  // Tempo massimo di inattività di 15 minuti
  private readonly INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

  initInactivityTimer(): void {
    this.setupListeners();
    this.resetTimer();
  }

  private setupListeners(): void {
    // Eseguito fuori da Angular Zone 
    // per non attivare inutilmente la Change Detection ad ogni movimento del mouse
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('mousemove', () => this.resetTimer());
      window.addEventListener('keydown', () => this.resetTimer());
      window.addEventListener('click', () => this.resetTimer());
      window.addEventListener('scroll', () => this.resetTimer());
    });
  }

  private resetTimer(): void {
    clearTimeout(this.timeoutId);

    if (this.authService.isAuthenticated()) {
      this.timeoutId = setTimeout(() => {
        this.ngZone.run(() => {
          console.warn('[AutoLogout] Sessione scaduta per inattività.');
          this.authService.logout();
          this.router.navigate(['/login']);
        });
      }, this.INACTIVITY_LIMIT_MS);
    }
  }
}