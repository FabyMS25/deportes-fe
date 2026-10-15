import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PassResets } from '../../models/passResets.model';
import { apiPost } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class PassResetsService {
  private readonly apiUrl = environment.backendUrl + '/passresets';

  constructor(private http: HttpClient) { }

  requestPasswordReset(email: string): Observable<PassResets> {
    return apiPost<PassResets>(this.http, this.apiUrl, { email }, 'solicitar recuperación de contraseña');
  }

  validateToken(token: string): Observable<boolean> {
    return apiPost<boolean>(this.http, `${this.apiUrl}/validate-token`, { token }, 'validar token de recuperación');
  }

  completePasswordReset(token: string, password: string): Observable<string> {
    return apiPost<string>(this.http, `${this.apiUrl}/complete`, { token, password }, 'restablecer contraseña');
  }
}
