import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './shared/auth.interceptor';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { AuthGoogleService } from './shared/services/auth-google.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), // Qui registriamo le rotte dell’app (navigazione principale)
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideOAuthClient(),
    provideAppInitializer(() => {
      const authGoogleService = inject(AuthGoogleService);
      return authGoogleService.initConfiguration();
    })
  ]
};
