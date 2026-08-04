import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from './services/authentication.service';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment.development';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthenticationService);
  const router = inject(Router);
  const token = authService.accessToken();

  const isApiUrl = req.url.startsWith(environment.apiUrl);

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
      // Se il backend risponde con 401 Unauthorized (token scaduto o non valido) 
      // Esegui il logout e reindirizza l'utente alla pagina di login
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};