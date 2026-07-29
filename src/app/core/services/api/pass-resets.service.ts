import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Reserva } from '../../models/reserva.model';
import { map, Observable, switchMap } from 'rxjs';


import { GlobalComponent } from "../../../global-component";
import { UserService } from '../api-users/users.service';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})

export class PassResetsService {
  apiUrl = environment.backendUrl + '/passresets';
  user=GlobalComponent.super_admin;

  constructor(private http: HttpClient , private authService:UserService) { }

  getAll(): Observable<Reserva[]> {
    return apiGet<Reserva[]>(this.http, this.apiUrl, 'obtener recuperaciones de contraseña');
  }

  getByUuid(uuid: String): Observable<Reserva> {
    return apiGet<Reserva>(this.http, `${this.apiUrl}${uuid}`, `obtener recuperación de contraseña (${uuid})`);
  }


  getToken(): Observable<any> {
    const user: any = GlobalComponent.super_admin;
  
    return this.authService.loginByUsername(user.username, user.password).pipe(
      map((data) => {
        return data.token; // Return the token
      })
    );
  }
  
  save(email: any): Observable<any> {
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 24);  // 24 hours expiration
  
    return this.getToken().pipe(
      switchMap((token) => {
        const data = {
          email: email,
          expiresAt: expirationTime.toISOString(), // Send expiration time in ISO format
          token: token 
        };
          return apiPost<any>(this.http, this.apiUrl, data, 'guardar recuperación de contraseña');
      })
    );
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
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `eliminar recuperación de contraseña (${uuid})`);
  }
}
