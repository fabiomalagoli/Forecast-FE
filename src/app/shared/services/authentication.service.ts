import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError, Observable } from 'rxjs';
import { ErrorService } from '../error.service';
import { environment } from '../../../environments/environment.development';
import { buildEntityError } from '../utils/http-error-message.utils';
import { UserForAuthentication, UserForRegistration, TokenDto, User } from '../models/user.model';

interface IdTokenGoogleDto {
  idToken: string
}

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
    if(token) {
      if (this.isTokenExpired(token)) {
        this.logout();
      } else {
        const userDetails = this.extractUserDataFromToken(token);
        this._currentUser.set({
          username: userDetails.username,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          profilePictureUrl: userDetails.profilePictureUrl
        });
      }
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
  login(credentials: UserForAuthentication): Observable<TokenDto> {
    return this.httpClient.post<TokenDto>(`${environment.apiUrl}/authentication/login`, credentials).pipe(
      tap((tokenDto) => {
        this.saveTokens(tokenDto);

        const userDetails = this.extractUserDataFromToken(tokenDto.accessToken);

        // Imposta l'utente (ricavabile dal token o dal payload)
        this._currentUser.set({
          username: userDetails.username || credentials.userName || '',
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          profilePictureUrl: userDetails.profilePictureUrl
        });
      }),
      catchError((error) => {
        this.errorService.showError('Errore durante l\'autenticazione dell\'utente.');
        return throwError(() => buildEntityError(error, 'utente', 'autenticazione'));
      })
    );
  }

  loginWithGoogle(body: IdTokenGoogleDto): Observable<TokenDto> {
      return this.httpClient.post<TokenDto>(`${environment.apiUrl}/authentication/google-login`, body).pipe(
        tap((tokenDto) => {
          this.saveTokens(tokenDto);
          // Imposta l'utente (ricavabile dal token o dal payload)
          const user = {
            ...this.extractUserDataFromToken(tokenDto.accessToken)
          }
          this._currentUser.set({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: user.profilePictureUrl
          });
        }),
        catchError((error) => {
          this.errorService.showError('Errore durante l\'autenticazione dell\'utente.');
          return throwError(() => buildEntityError(error, 'utente', 'autenticazione'));
        })
    );
  }

  private extractUserDataFromToken(token: string): { 
    firstName: string;
    lastName: string; 
    username: string; 
    profilePictureUrl?: string
  } {
    const tokenPart =  token.split('.')[1];
    const base64 = tokenPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(base64);
    
    const payload = JSON.parse(decoded);
    const firstName = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] || '';
    const lastName = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] || '';
    const username = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload['name'] || payload['sub'] || '';
    const profilePictureUrl = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/picture'] || payload['picture'] || undefined;
    return { firstName, lastName, username, profilePictureUrl };
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