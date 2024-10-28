import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { Contribuyente } from '../../models/contribuyente.models';

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
    return this.http.post<any>(`${this.apiUrl}/login`, { user, pass });
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
    return this.http.get<Contribuyente[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: String): Observable<Contribuyente> {
    return this.http.get<Contribuyente>(`${this.apiUrl}/${uuid}`)
  }

  getByEmail(email: String): Observable<Contribuyente> {
    return this.http.get<Contribuyente>(`${this.apiUrl}/email/${email}`)
  }

  save(data: Contribuyente): Observable<Contribuyente> {
    return this.http.post<Contribuyente>(`${this.apiUrl}`, data);
  }

  update(data: Contribuyente): Observable<Contribuyente> {
    return this.http.put<Contribuyente>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}


