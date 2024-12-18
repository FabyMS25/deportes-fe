import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

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
        if(currentUser){ 
        // if (this.authService.isAuthenticated()) {
            if (state.url === '/') {
                const dashboardUrl = this.authService.getDashboardUrl();
                this.router.navigate([dashboardUrl]);
                    return false;
            }
            const hasPermission = this.authService.hasRoutePermission(baseUrl);
            return hasPermission;     
        }else{
            this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
            return false;
        }       
    }


}
