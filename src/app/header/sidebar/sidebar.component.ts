import { Component, inject, signal, DestroyRef } from '@angular/core';
import { output } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  selected = output<string>();

  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  activeMenu = signal<string>(this.estraiMenuDaUrl(window.location.pathname));

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
  onBtnClick(id: string) {
    this.activeMenu.set(id);
    this.selected.emit(id); 
  }
}
