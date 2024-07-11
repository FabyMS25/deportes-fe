
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalComponent } from "../../../global-component";

const ruatUrl = `${environment.apiRuatUrl}`;
// const ruatUrl = 'https://cors-anywhere.herokuapp.com/https://verificacionjboss.ruat.gob.bo';
@Injectable({
  providedIn: 'root'
})
export class RuatAuthService {

  constructor(
    private http: HttpClient,
  ) { }

  // authenticate(): Observable<any> {
  //   const username=GlobalComponent.RUAT_usuario;
  //   const password=GlobalComponent.RUAT_clave;
  //   const headers = new HttpHeaders({
  //     'Content-Type': 'application/json',
  //     'usuario': username,
  //     'clave': password
  //   });
  //   return this.http.post<any>(`${ruatUrl}/ServiciosRuatJEE-web/api/autentificacion`, { headers });
  // }

  authenticate(): Observable<any> {
    const username = GlobalComponent.RUAT_usuario;
    const password = GlobalComponent.RUAT_clave;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'Usuario': username,
      'Clave': password
    });
    return this.http.post<any>(
      `${ruatUrl}/ServiciosRuatJEE-web/api/autentificacion`, 
      null, 
      { 
        headers: headers,
        withCredentials: true
      }
    );
  }
  // constructor(private ruatService: RuatService) {}

  // onLogin(username: string, password: string) {
  //   this.ruatService.authenticate().subscribe(
  //     (response) => {
  //       // Handle successful response here
  //       console.log('API Authentication Response:', response);
  //     },
  //     (error) => {
  //       // Handle error here
  //       console.error('Error:', error);
  //     }
  //   );
  // }

  getContribuyentePorCi(token: string, nroDocumento: string, tipoDocumento: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const requestData = {
      'codigoAlcaldia': 'QUI',
      'numeroDocumento': nroDocumento,
      'tipoDocumento': tipoDocumento
    };

    return this.http.post<any>(
      `${ruatUrl}/RuatServiciosWebContribuyentes/contribuyentes/comun/busquedaContribuyente`,
      requestData,
      { headers }
    );
  }
    // this.ruatService.getContribuyentePorCi(token, ci, tipoDocumento).subscribe(
    //   (response) => {
    //     // Handle successful response here
    //     console.log('Contribuyente Data:', response);
    //   },
    //   (error) => {
    //     // Handle error here
    //     console.error('Error:', error);
    //   }
    // );

    getDeudasContribuyente(token: string, tipoConsulta: string, nroDocumento: string, tipoDocumento: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const requestData = {
      'codigoAlcaldia': 'QUI',
      'tipoConsulta': tipoConsulta,
      'numeroDocumento': nroDocumento,
      'tipoDocumento': tipoDocumento
    };

    return this.http.post<any>(
      `${ruatUrl}/RuatServiciosWebTasasOI/tasasOI/consultaDeudaTasaContrib`,
      requestData,
      { headers }
    );
  }
  // this.ruatService.getDeudasContribuyente(token, tipoConsulta, nroDocumento, tipoDocumento).subscribe(
  //     (response) => {
  //       // Handle successful response here
  //       console.log('Deuda Data:', response);
  //     },
  //     (error) => {
  //       // Handle error here
  //       console.error('Error:', error);
  //     }
  //   );

}
