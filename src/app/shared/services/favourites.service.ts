import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';

@Injectable({ providedIn: 'root' })
export class FavouritesService {
    private readonly STORAGE_KEY = 'favourites';
    private httpClient = inject(HttpClient);
    private favoritesPagination = signal<any>(null);
    private favorites$ = new BehaviorSubject<string[]>(this.loadFromStorage());
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

    toggleFavorite(projectId: string): void {
        const currentFavs = [...this.favorites$.value];
        const index = currentFavs.indexOf(projectId);

        if (index > -1) {
            currentFavs.splice(index, 1);
        } else {
            currentFavs.push(projectId);
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentFavs));
        this.favorites$.next(currentFavs);
    }
}