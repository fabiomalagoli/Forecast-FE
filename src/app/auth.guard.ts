import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthenticationService } from './shared/services/authentication.service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthenticationService);
    const router = inject(Router);

    if(authService.isAuthenticated()) {
        return true;
    }

    return router.createUrlTree(['/login']);
}