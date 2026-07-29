import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { AuthGoogleService } from '../../shared/services/auth-google.service';

@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './authentication.component.html',
  styleUrls: ['./authentication.component.scss'],
  host: { class: 'd-flex align-items-center py-4 bg-body-tertiary min-vh-100' }
})
export class AuthenticationComponent {
  private readonly authGoogleService = inject(AuthGoogleService);

  // Signal per lo stato di caricamento ed eventuali errori
  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  signInWithGoogle(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      this.authGoogleService.login();
    } catch (error) {
      this.isLoading.set(false);
      this.errorMessage.set('Si è verificato un errore durante l\'accesso con Google.');
    }
  }
}