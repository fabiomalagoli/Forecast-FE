import { Component, inject, signal, DestroyRef, OnInit, computed, output } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthenticationService } from '../../shared/services/authentication.service';
import { AuthGoogleService } from '../../shared/services/auth-google.service';
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [MatIconModule, MatMenuModule, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  selected = output<string>();

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthenticationService);
  private readonly authGoogleService = inject(AuthGoogleService);

  activeMenu = signal<string>(this.estraiMenuDaUrl(window.location.pathname));

  readonly currentUser = this.authService.currentUser;
  readonly firstName = computed(() => this.currentUser()?.firstName || '');
  readonly lastName = computed(() => this.currentUser()?.lastName || '');
  readonly profilePictureUrl = computed(() => this.currentUser()?.photoUrl || '');

  ngOnInit() {
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
    if (url.includes('/workgroups')) return 'Workgroups';
    return 'Home';
  }

  logout() {
    this.authGoogleService.logout();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onBtnClick(id: string) {
    this.activeMenu.set(id);
    this.selected.emit(id); 
  }
}