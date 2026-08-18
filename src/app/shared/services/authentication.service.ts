import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError, Observable } from 'rxjs';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';
import { UserForAuthentication, UserForRegistration, TokenDto, User, AuthResponseDto } from '../models/user.model';

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


  constructor() {
    this.initUserFromStorage();
  }

  private initUserFromStorage(): void {
    const token = this._accessToken();
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      if (this.isTokenExpired(token)) {
        this.logout();
      } else {
        try {
          this._currentUser.set(JSON.parse(storedUser));
        } catch {
          this.logout();
        }
      }
    } else if (token) {
      this.logout();
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if(!payload.exp) return false; 
      return Date.now() >= payload.exp * 1000;
    } catch (error) {
      return true;
    }
  }

  // Effettua il login inviando username e password nel Body della richiesta (UserForAuthenticationDto sul backend)
  login(credentials: UserForAuthentication): Observable<AuthResponseDto> {
    return this.httpClient.post<AuthResponseDto>(`${environment.apiUrl}/authentication/login`, credentials).pipe(
      tap((authResponse) => this.saveAuthData(authResponse)),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'autenticazione dell\'utente.');
        return throwError(() => buildEntityError(error, 'utente', 'autenticazione'));
      })
    );
  }

  loginWithGoogle(body: { idToken: string }): Observable<AuthResponseDto> {
    return this.httpClient.post<AuthResponseDto>(`${environment.apiUrl}/authentication/google-login`, body).pipe(
      tap((authResponse) => this.saveAuthData(authResponse)),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'autenticazione Google.');
        return throwError(() => buildEntityError(error, 'utente', 'autenticazione'));
      })
    );
  }

  private saveAuthData(authResponse: AuthResponseDto): void {
    this._accessToken.set(authResponse.tokens.accessToken);
    this._refreshToken.set(authResponse.tokens.refreshToken);
    localStorage.setItem('accessToken', authResponse.tokens.accessToken);
    localStorage.setItem('refreshToken', authResponse.tokens.refreshToken);

    const userId = authResponse.user.id || this.getUserIdFromToken(authResponse.tokens.accessToken);

    const user: User = {
      id: userId,
      userName: authResponse.user.userName,
      firstName: authResponse.user.firstName,
      lastName: authResponse.user.lastName,
      photoUrl: authResponse.user.pictureUrl
    };

    this._currentUser.set(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Registrazione
  register(userData: UserForRegistration) {
    return this.httpClient.post(`${environment.apiUrl}/authentication/register`, userData).pipe(
      catchError((error) => {
        this.errorService.showError('Errore durante la registrazione dell\'utente.');
        return throwError(() => buildEntityError(error, 'utente', 'registrazione'));
      })
    );
  }

  // Rinnova l'access token usando il refresh token
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

  private getUserIdFromToken(token: string): string | undefined {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    } catch {
      return undefined;
    }
  }

  // Disconnette l'utente e pulisce lo stato
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