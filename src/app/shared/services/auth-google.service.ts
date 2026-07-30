import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from '../../auth.config';
import { AuthenticationService } from './authentication.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root',
})

export class AuthGoogleService {

    private oAuthService = inject(OAuthService);
    private authService = inject(AuthenticationService);
    private router = inject(Router);
    readonly profile = signal<any>(null);

    constructor() {
        this.initConfiguration();
    }

    initConfiguration(): Promise<boolean> {
        this.oAuthService.configure(authConfig);
        this.oAuthService.setupAutomaticSilentRefresh();
        return this.oAuthService
            .loadDiscoveryDocumentAndTryLogin()
            .then(async (loggedIn) => {
                console.log('[AuthGoogleService] Risultato tryLogin:', loggedIn);
                console.log('[AuthGoogleService] Ha un token valido?', this.oAuthService.hasValidIdToken());

                if(this.oAuthService.hasValidIdToken()){
                    const claims = this.oAuthService.getIdentityClaims() as any;
                    const idToken = this.oAuthService.getIdToken();

                    try {
                        // Invia il token al backend e attende il JWT di Forecast
                        await firstValueFrom(this.authService.loginWithGoogle({ idToken }));

                        // Se il backend risponde positivamente, salva il profilo Google e naviga alla Home
                        this.profile.set(claims);
                        this.router.navigate(['/home']);
                    } catch (err) {
                        console.error('[AuthGoogleService] Accesso negato dal backend:', err);

                        // L'utente non è nel database. Annulliamo la sessione Google
                        this.logout();
                        return false;
  }

                    this.router.navigate(['/home']);
                }
                return loggedIn;
            })
            .catch((err) => {
                console.error('[AuthGoogleService] Errore login Google: ', err);
                return false;
            });
    }

    login(): void {
        if (!this.oAuthService.hasValidIdToken()) {
            this.oAuthService.initCodeFlow();
        }
        else {
            this.router.navigate(['/home']);
        }
    }

    logout() {
        this.oAuthService.revokeTokenAndLogout();
        this.oAuthService.logOut();
        this.authService.logout();
        this.profile.set(null);
    }

    getProfile() {
        return this.profile();
    }

}