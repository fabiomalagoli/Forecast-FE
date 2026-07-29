import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthenticationService } from './services/authentication.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment.development';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthenticationService);
  const token = authService.accessToken(); // Signal con il token corrente

  // Controllo della direzione della richiesta al backend dell'applicazione 
  const isApiUrl = req.url.startsWith(environment.apiUrl);

  // Aggiungi l'header Authorization solo se esiste un token e la chiamata è diretta al backend dell'applicazione
  if(token && isApiUrl){
    req = req.clone({
      setHeaders: {
        Authorization: 'Bearer ${token}'
      }
    });
  }

  return next(req);

};