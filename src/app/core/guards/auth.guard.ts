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
    
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot):boolean {
        const baseUrl = state.url.split('?')[0];
        const requiredPermission = route.data['requiredPermission'];

        const currentUser =   window.sessionStorage.getItem("currentUser");
        if(!currentUser){
            this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
            return false;

        }
        if (this.authService.hasRoutePermission(baseUrl)) {
            return true;
        } else {
            const link =this.authService.getRouteDB();
            this.router.navigate(['/inicio/'+link]);            
            return false;
        }
            
        // if (!this.authService.isLoggedIn()) {
        //     this.router.navigate(['/auth/login']);
        //     return false;            
        // }    
        const hasPermission = this.authService.hasRoutePermission(baseUrl);
        return hasPermission;         
    }


}
