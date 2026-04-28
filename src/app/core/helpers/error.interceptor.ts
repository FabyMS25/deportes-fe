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
            const isRuatRequest = request.url.includes('/ruat');
            if (err.status === 401 && !isRuatRequest) {
                // auto logout if 401 response returned from api
                this.authenticationService.logout();
                location.reload();
            }
            const error = err.error?.message || err.error?.mensaje || err.statusText;
            return throwError(error);
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
