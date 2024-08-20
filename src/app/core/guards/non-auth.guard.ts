import {Injectable} from '@angular/core';
import {
    CanActivate,
    CanActivateChild,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    UrlTree,
    Router
} from '@angular/router';
import {Observable} from 'rxjs';
import { AuthenticationService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class NonAuthGuard implements CanActivate, CanActivateChild {
    constructor(private router: Router,
        private authService: AuthenticationService) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ):
        | Observable<boolean | UrlTree>
        | Promise<boolean | UrlTree>
        | boolean
        | UrlTree {
        // const token =   window.sessionStorage.getItem("auth-token");
        // if (!token) {
        //     return true;
        // }        
        const currentUser =   window.sessionStorage.getItem("currentUser");
        if(!currentUser){
            return true
        }
        const link =this.authService.getRouteDB();
        this.router.navigate(['/inicio/'+link]);
        return false;
    }
    canActivateChild(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ):
        | Observable<boolean | UrlTree>
        | Promise<boolean | UrlTree>
        | boolean
        | UrlTree {
        return this.canActivate(route, state);
    }
}
