import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Reserva } from '../../models/reserva.model';
import { map, Observable, switchMap } from 'rxjs';


import { GlobalComponent } from "../../../global-component";
import { UserService } from '../api-users/users.service';

@Injectable({
  providedIn: 'root'
})

export class PassResetsService {
  apiUrl = environment.backendUrl + '/passresets';
  user=GlobalComponent.super_admin;

  constructor(private http: HttpClient , private authService:UserService) { }

  getAll(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: String): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.apiUrl}${uuid}`);
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
          return this.http.post<any>(`${this.apiUrl}`, data);
      })
    );
  }

  validateToken(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/validate-token/${token}` )
  }
  getUserByToken(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/validate-token-get-user/${token}` );
  }

  
  update(data: Reserva): Observable<Reserva> {
    return this.http.put<Reserva>(`${this.apiUrl}`, data);
  }

  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
