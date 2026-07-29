import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LoginResponse } from '../../models/user/login-response.model';
import { apiGet, apiPost, apiPut } from '../apiResponses';
import { Person } from '../../models/user/person.model';

const usersUrl = `${environment.apiLoginUrl}`;

@Injectable({ providedIn: 'root' })

export class UserService {

    constructor(private http: HttpClient ) {}
  
    loginByUsername(username: string, password: string): Observable<LoginResponse> {
      return apiPost<LoginResponse>(this.http, `${usersUrl}/auth/signin`, {username, password}, 'loguear usuario');
    }

    // loginByUsername(username: String, password: String) {
    //     return this.http.post<any>(`${usersUrl}/auth/signin`, {username, password});
    // }

    getAllUsers(): Observable<any[]> {
        return apiGet<any[]>(this.http, `${usersUrl}/listar/usuarios`, 'obtener usuarios');
    } 
  
    getUserByUuid(uuid:String) {
        return apiGet<any[]>(this.http, `${usersUrl}/usuario/${uuid}`, `obtener usuario (${uuid})`);
    }

    updateUser(data:any): Observable<any> {
        return apiPut<any>(this.http, `${usersUrl}/user/update`, data, 'actualizar usuario');
    }

    changePassword(uuidUsuario:string, newPassword:string): Observable<any> {
        return apiPost<any>(this.http, `${usersUrl}/user/change-password`, {uuidUsuario, newPassword}, 'cambiar contraseña');
    }

    updatePersona(persona: Person): Observable<Person> {
        return apiPut<Person>(this.http, `${usersUrl}/persona`, persona, 'actualizar persona');
    }
}
