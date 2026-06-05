import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { ProjectsService } from './projects.service';
import { SnackbarService } from './snackbar.service';
import { NotifyAction } from '../enums/notify.enum';

@Injectable({ providedIn: 'root' })
export class FavouritesService {
    private readonly STORAGE_KEY = 'favourites';
    private httpClient = inject(HttpClient);
    private favoritesPagination = signal<any>(null);
    private favorites$ = new BehaviorSubject<string[]>(this.loadFromStorage());
    private projectsService = inject(ProjectsService);
    private snackbarService = inject(SnackbarService);
    paginationData = this.favoritesPagination.asReadonly();

    constructor() {}

    private loadFromStorage(): string[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    getFavorites(): string[] {
        return this.favorites$?.value;
    }

    isFavorite(projectId: string): boolean {
        return this.getFavorites().includes(projectId);
    }

    toggleFavorite(projectId: string, currentFavoriteState: boolean): void {
        const nextFavoriteState = !currentFavoriteState;

        this.projectsService.toggleFavoriteState(projectId, nextFavoriteState).subscribe({
            error: (error) => {
                console.error('Errore durante l\'aggiornamento dello stato del preferito:', error);
                this.snackbarService.error(NotifyAction.Aggiornamento, 'lo stato del preferito');
            }
        });
    }
}