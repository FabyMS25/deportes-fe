import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Reserva } from '../../models/reserva.model';
import { Observable } from 'rxjs';


import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})

export class PassResetsService {
  apiUrl = environment.backendUrl + '/passresets';
  constructor(private http: HttpClient) { }

  getAll(): Observable<Reserva[]> {
    return apiGet<Reserva[]>(this.http, this.apiUrl, 'obtener recuperaciones de contraseña');
  }

  getByUuid(uuid: String): Observable<Reserva> {
    return apiGet<Reserva>(this.http, `${this.apiUrl}/${uuid}`, `obtener recuperación de contraseña (${uuid})`);
  }


  save(email: any): Observable<any> {
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 24);  // 24 hours expiration
  
    return apiPost<any>(this.http, this.apiUrl, {
      email,
      expiresAt: expirationTime.toISOString()
    }, 'guardar recuperación de contraseña');
  }

  validateToken(token: string): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/validate-token/${token}`, 'validar token de recuperación')
  }
  getUserByToken(token: string): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/validate-token-get-user/${token}`, 'obtener usuario por token de recuperación');
  }

  
  update(data: Reserva): Observable<Reserva> {
    return apiPut<Reserva>(this.http, this.apiUrl, data, 'actualizar recuperación de contraseña');
  }

  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `anular recuperación de contraseña (${uuid})`);
  }
}
