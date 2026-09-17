import { Injectable } from '@angular/core';
import { Injector } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthenticationService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

    constructor(private injector: Injector) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            const isLoginRequest = request.url.includes('/auth/login');
            const origin = err.headers?.get('X-Response-Origin');
            const isUpstreamRuatResponse = origin === 'RUAT' || origin === 'ruat-be';
            if (err.status === 401 && !isLoginRequest && !isUpstreamRuatResponse) {
                const authenticationService = this.injector.get(AuthenticationService);
                if (authenticationService.isLoggedIn()) {
                    void authenticationService.handleExpiredSession();
                }
            }
            return throwError(() => err);
        }))
    }
}
