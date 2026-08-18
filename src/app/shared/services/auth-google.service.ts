import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
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
    readonly initialized = signal<boolean>(false);
    private initPromise: Promise<boolean> | null = null;

    constructor() {}

    initConfiguration(): Promise<boolean> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.oAuthService.configure(authConfig);

        this.initPromise = this.oAuthService
            .loadDiscoveryDocumentAndTryLogin()
            .then(async (loggedIn) => {
                console.log('[AuthGoogleService] Risultato tryLogin:', loggedIn);
                console.log('[AuthGoogleService] Ha un token valido?', this.oAuthService.hasValidIdToken());

                if (this.oAuthService.hasValidIdToken()) {
                    // Abilita il silent refresh SOLO se abbiamo un token valido
                    this.oAuthService.setupAutomaticSilentRefresh();

                    const claims = this.oAuthService.getIdentityClaims() as any;
                    const idToken = this.oAuthService.getIdToken();
                    this.profile.set(claims);

                    if (!this.authService.isAuthenticated()) {
                        try {
                            await firstValueFrom(this.authService.loginWithGoogle({ idToken }));

                            if (this.router.url.startsWith('/login') || this.router.url === '/') {
                                this.router.navigate(['/home']);
                            }
                        } catch (err) {
                            console.error('[AuthGoogleService] Accesso negato dal backend:', err);
                            
                            // Pulizia SENZA azzerare initPromise per non riavviare il loop
                            this.oAuthService.logOut(true);
                            this.authService.logout();
                            this.profile.set(null);
                            
                            this.initialized.set(true);
                            this.router.navigate(['/contact-administrator']);
                            return false;
                        }
                    }
                }

                this.initialized.set(true);
                return loggedIn;
            })
            .catch((err) => {
                console.warn('[AuthGoogleService] Token o configurazione OAuth non valida:', err);
                
                // In caso di errore OAuth, pulisci la sessione senza il loop
                this.oAuthService.logOut(true);
                this.profile.set(null);
                this.initialized.set(true);
                return false;
            });

        return this.initPromise;
    }

    login(): void {
        this.oAuthService.initCodeFlow();
    }

    logout() {
        this.initPromise = null;
        this.oAuthService.revokeTokenAndLogout();
        this.oAuthService.logOut();
        this.authService.logout();
        this.profile.set(null);
    }

    getProfile() {
        return this.profile();
    }
}