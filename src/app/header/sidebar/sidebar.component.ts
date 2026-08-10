import { Component, inject, signal, DestroyRef } from '@angular/core';
import { output } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { computed } from '@angular/core';
import { AuthenticationService } from '../../shared/services/authentication.service';
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { AuthGoogleService } from '../../shared/services/auth-google.service';

@Component({
  selector: 'app-sidebar',
  imports: [MatIconModule, MatMenuModule, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  selected = output<string>();

  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthenticationService);
  private authGoogleService = inject(AuthGoogleService);

  activeMenu = signal<string>(this.estraiMenuDaUrl(window.location.pathname));

  // readonly currentUser = this.authService.currentUser;  
  readonly currentUser = computed(() => this.authGoogleService.getProfile());
  readonly firstName = computed(() => this.currentUser()?.given_name || '');
  readonly lastName = computed(() => this.currentUser()?.family_name || '');
  readonly profilePictureUrl = computed(() => this.currentUser()?.picture || '');
  
  ngOnInit() {
    // Logica di ascolto mantenuta per quando navighi all'interno dell'applicazione: ogni volta che la route cambia, aggiorniamo il menu attivo in base alla nuova URL
    const sub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.activeMenu.set(this.estraiMenuDaUrl(event.urlAfterRedirects));
    });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private estraiMenuDaUrl(url: string): string {
    if (url.includes('/clienti')) return 'Clienti';
    if (url.includes('/progetti')) return 'Progetti';
    if (url.includes('/ruoli')) return 'Ruoli';
    if (url.includes('/risorse')) return 'Risorse';
    if (url.includes('/workgroups')) return 'Workgroups'
    return 'Home';
  }

  logout() {
    this.authGoogleService.logout();
    this.router.navigate(['/login']);
  }

  onBtnClick(id: string) {
    this.activeMenu.set(id);
    this.selected.emit(id); 
  }
}
