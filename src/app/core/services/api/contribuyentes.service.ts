import { HttpClient } from '@angular/common/http';
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
      uuid:	"5ecd8156-502a-4a21-ba3a-1112d2322994",
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

  // loginByUsername(username: String, password: String) {
  //   // return this.http.post<any>(`${this.apiUrl}/auth/signin`, {username, password});
  // }
  loginByUsername(username: string, password: string){
    if (username === this.contribuyente.userName && password === this.contribuyente.password) {
      return of(this.contribuyente);
    } else {
      return new Observable(observer => {
        observer.error('Invalid credentials');
        observer.complete();
      });
    }
  }
  getAll(): Observable<Contribuyente[]> {
    return this.http.get<Contribuyente[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: String): Observable<Contribuyente> {
    return this.http.get<Contribuyente>(`${this.apiUrl}/${uuid}`)
  }

  save(data: Contribuyente): Observable<Contribuyente> {
    return this.http.post<Contribuyente>(`${this.apiUrl}`, data);
  }

  update(data: Contribuyente): Observable<Contribuyente> {
    return this.http.put<Contribuyente>(`${this.apiUrl}`, data);
  }
  delete(uuid: String) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}


