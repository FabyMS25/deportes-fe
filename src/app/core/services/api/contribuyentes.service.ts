import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Contribuyente } from '../../models/contribuyente.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class ContribuyentesService {

    apiUrl = environment.backendUrl + '/contribuyente';

    contribuyente = {
      uuid:	"d133432d-ecc5-4952-af1b-1ca825f815f9",
      userName:	"contribuyente",
      password:	"Contribuyente",
      nombre:	"FABIOLA",
      apPaterno:	"MORALES",
      apMaterno:	"S",
      nroCarnet:	"8695227",
      nroNit:	"",
      ciExpedido:	"COCHABAMBA",
      sexo:	"F",
      direccion:	"",
      celular:	"72248669",
      correo:	"moralessfaby.dev@gmail.com",
      tipoContribuyente:	"NA",
      codigoContribuyente:	"0A025F03001B0E001407505B51",
      tipoDocumento:	"CI",
      estadoCivil:	"SOLTERO",
      fechaNac:	"23/04/1999",
      estadoUsuario:	"Active",
      // estado:	false
    }

  constructor(private http: HttpClient) { }

  loginByUsername(user: String, pass: String) {
    return apiPost<any>(this.http, `${this.apiUrl}/login`, { user, pass }, 'loguear contribuyente');
  }
  // loginByUsername(user: string, pass: string) {
  //   const params = { user, pass };
  //   return this.http.get<any>(`${this.apiUrl}/login`, { params });
  // }
  
  // loginByUsername(username: string, password: string){
  //   if (username === this.contribuyente.userName && password === this.contribuyente.password) {
  //     return of(this.contribuyente);
  //   } else {
  //     return new Observable(observer => {
  //       observer.error('Invalid credentials');
  //       observer.complete();
  //     });
  //   }
  // }
  getAll(): Observable<Contribuyente[]> {
    return apiGet<Contribuyente[]>(this.http, this.apiUrl, 'obtener contribuyentes');
  }

  getByUuid(uuid: String): Observable<Contribuyente> {
    return apiGet<Contribuyente>(this.http, `${this.apiUrl}/${uuid}`, `obtener contribuyente (${uuid})`)
  }

  getByEmail(email: String): Observable<Contribuyente> {
    return apiGet<Contribuyente>(this.http, `${this.apiUrl}/email/${email}`, `obtener contribuyente por email (${email})`)
  }

  publicExists(criteria: {
    numeroDocumento?: string;
    email?: string;
    userName?: string;
  }): Observable<{ numeroDocumento?: boolean; email?: boolean; userName?: boolean }> {
    return apiGet(this.http, `${this.apiUrl}/public/exists`, 'validar existencia de contribuyente', {
      params: criteria
    });
  }

  save(data: Contribuyente): Observable<Contribuyente> {
    return apiPost<Contribuyente>(this.http, this.apiUrl, data, 'guardar contribuyente');
  }

  update(data: Contribuyente): Observable<Contribuyente> {
    return apiPut<Contribuyente>(this.http, this.apiUrl, data, 'actualizar contribuyente');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `eliminar contribuyente (${uuid})`);
  }
}


