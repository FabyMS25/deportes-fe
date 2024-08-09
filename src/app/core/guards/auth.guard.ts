import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

// Auth Services
import { AuthenticationService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard  {
    constructor(
        private router: Router,
        private authService: AuthenticationService,
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        // if (environment.defaultauth === 'firebase') {
            const currentUser = this.authService.currentUser();
            if (currentUser) {
                // logged in so return true
                // return true;
            }
            
        if (!this.authService.isLoggedIn()) {
            this.router.navigate(['/auth/login']);
            return false;            
        }
        // } else {
            // const currentUser = this.authFackservice.currentUserValue;
            // if (currentUser) {
                // logged in so return true
            //     return true;
            // }
            // check if user data is in storage is logged in via API.
            // if(sessionStorage.getItem('currentUser')) {
            //     return true;
            // }
        // }
        // not logged in so redirect to login page with the return url
        // this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return true;
    }
}
