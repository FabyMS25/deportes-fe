import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthenticationService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

    constructor(private authenticationService: AuthenticationService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            const isLoginRequest = request.url.includes('/auth/login');
            if (err.status === 401 && !isLoginRequest && this.authenticationService.isLoggedIn()) {
                void this.authenticationService.handleExpiredSession();
            }
            return throwError(() => err);
        }))
    }
    // intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    //     const modifiedReq = req.clone({
    //       setHeaders: {
    //         'X-Requested-With': 'XMLHttpRequest'
    //       }
    //     });
    //     return next.handle(modifiedReq);
    //   }
}
