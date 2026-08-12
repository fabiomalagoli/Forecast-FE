import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from './services/authentication.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment.development';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthenticationService);
  const router = inject(Router);
  const token = authService.accessToken();

  const isApiUrl = req.url.startsWith(environment.apiUrl) || req.url.startsWith('api/') || req.url.startsWith('/api');

  // Aggiungi l'header Authorization solo se esiste un token e la chiamata è diretta al backend dell'applicazione
  if (token && isApiUrl) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Intercetta gli errori HTTP della risposta
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthRequest = req.url.includes('/token/refresh') || req.url.includes('/authentication');
      // Se il backend risponde con 401 Unauthorized (token scaduto o non valido) 
      // Esegui il logout e reindirizza l'utente alla pagina di login
      if (error.status === 401 && !isAuthRequest) {
        // Tenta il Refresh Token per l'utente, se fallisce, esegue il logout
        return authService.refreshToken().pipe(
          switchMap(() => {
            const newToken = authService.accessToken();

            // Riprova la richiesta con il nuovo Access Token
            const clonedReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`
              }
            });

            return next(clonedReq);
          }),
          catchError((refreshError) => {
            // Se anche il Refresh Token è scaduto o non valido, esegui il logout
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }

      if (error.status === 401 && isAuthRequest) {
        authService.logout();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};