import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AutoLogoutService implements OnDestroy {
  private readonly authService = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  private timeoutId: any;
  private isListening = false;
  private readonly INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minuti

  // Riferimento alla funzione per removeEventListener
  private readonly userActionHandler = () => this.resetTimer();

  initInactivityTimer(): void {
    if (!this.isListening) {
      this.setupListeners();
      this.isListening = true;
    }
    this.resetTimer();
  }

  stopInactivityTimer(): void {
    clearTimeout(this.timeoutId);
    if (this.isListening) {
      this.removeListeners();
      this.isListening = false;
    }
  }

  private setupListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.userActionHandler);
      window.addEventListener('keydown', this.userActionHandler);
      window.addEventListener('click', this.userActionHandler);
      window.addEventListener('scroll', this.userActionHandler);
    });
  }

  private removeListeners(): void {
    window.removeEventListener('mousemove', this.userActionHandler);
    window.removeEventListener('keydown', this.userActionHandler);
    window.removeEventListener('click', this.userActionHandler);
    window.removeEventListener('scroll', this.userActionHandler);
  }

  private resetTimer(): void {
    clearTimeout(this.timeoutId);

    if (this.authService.isAuthenticated()) {
      this.timeoutId = setTimeout(() => {
        this.ngZone.run(() => {
          console.warn('[AutoLogout] Sessione scaduta per inattività.');
          this.stopInactivityTimer();
          this.authService.logout();
          this.router.navigate(['/login']);
        });
      }, this.INACTIVITY_LIMIT_MS);
    }
  }

  ngOnDestroy(): void {
    this.stopInactivityTimer();
  }
}