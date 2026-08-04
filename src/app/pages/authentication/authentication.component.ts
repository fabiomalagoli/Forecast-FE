import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
export class AuthenticationComponent implements OnInit, OnDestroy {
  private readonly authGoogleService = inject(AuthGoogleService);

  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  private onPageShow = (event: PageTransitionEvent) => {
    // Se la pagina viene mostrata dalla cache del browser o riaperta
    this.isLoading.set(false);
  };

  ngOnInit(): void {
    this.isLoading.set(false);
    window.addEventListener('pageshow', this.onPageShow);
  }

  ngOnDestroy(): void {
    window.removeEventListener('pageshow', this.onPageShow);
  }

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