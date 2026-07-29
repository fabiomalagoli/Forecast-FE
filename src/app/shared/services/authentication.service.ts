import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError, Observable } from 'rxjs';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';
import { UserForAuthentication, UserForRegistration, TokenDto, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private readonly httpClient = inject(HttpClient);
  private readonly errorService = inject(ErrorService);

  // Signal per i dati dell'utente ed i token
  private readonly _currentUser = signal<User | null>(null);
  private readonly _accessToken = signal<string | null>(localStorage.getItem('accessToken'));
  private readonly _refreshToken = signal<string | null>(localStorage.getItem('refreshToken'));

  // Signal pubblici in sola lettura
  readonly currentUser = this._currentUser.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken());

  /* Effettua il login inviando username e password nel Body della richiesta (UserForAuthenticationDto sul backend) */
  login(credentials: UserForAuthentication): Observable<TokenDto> {
    return this.httpClient.post<TokenDto>(`${environment.apiUrl}/authentication/login`, credentials).pipe(
      tap((tokenDto) => {
        this.saveTokens(tokenDto);
        // Imposta l'utente (ricavabile dal token o dal payload)
        this._currentUser.set({ username: credentials.userName || '' });
      }),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'autenticazione dell\'utente.');
        return throwError(() => buildEntityError(error, 'utente', 'autenticazione'));
      })
    );
  }

  /* Registrazione */
  register(userData: UserForRegistration) {
    return this.httpClient.post(`${environment.apiUrl}/authentication/register`, userData).pipe(
      catchError((error) => {
        this.errorService.showError('Errore durante la registrazione dell\'utente.');
        return throwError(() => buildEntityError(error, 'utente', 'registrazione'));
      })
    );
  }

  setGoogleUser(idToken: string, claims: any): void {
    this._accessToken.set(idToken);
    localStorage.setItem('accessToken', idToken);

    this._currentUser.set({
      username: claims?.email || claims?.name || 'Utente Google'
    });
  }

  /* Rinnova l'access token usando il refresh token */
  refreshToken(): Observable<TokenDto> {
    const refreshToken = this._refreshToken();
    const accessToken = this._accessToken();

    return this.httpClient.post<TokenDto>(`${environment.apiUrl}/token/refresh`, {
      accessToken,
      refreshToken
    }).pipe(
      tap((tokenDto) => {
        this.saveTokens(tokenDto);
      }),
      catchError((error) => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  /* Disconnette l'utente e pulisce lo stato */
  logout(): void {
    this._currentUser.set(null);
    this._accessToken.set(null);
    this._refreshToken.set(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private saveTokens(tokenDto: TokenDto): void {
    this._accessToken.set(tokenDto.accessToken);
    this._refreshToken.set(tokenDto.refreshToken);
    localStorage.setItem('accessToken', tokenDto.accessToken);
    localStorage.setItem('refreshToken', tokenDto.refreshToken);
  }
}