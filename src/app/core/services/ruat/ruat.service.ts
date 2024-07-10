
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalComponent } from "../../../global-component";
// GlobalComponent.API_URL + GlobalComponent.product,
const ruatUrl = `${environment.apiRuatUrl}`;

@Injectable({
  providedIn: 'root'
})
export class RuatService {

  constructor(
    private http: HttpClient,
  ) { }

  // login(username: string, password: string): Observable<any> {
  authenticate(): Observable<any> {
    const username="PRUEBA.QUI";
    const password="S1234567";
    // const password="Gam#1209";
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'usuario': username,
      'clave': password
    });

    return this.http.post<any>(`${ruatUrl}/ServiciosRuatJEE-web/api/autentificacion`, null, { headers });
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



/* ------API REST RUAT TASAS y OTROS SERVICIOS -------*/
  //  this.ruatService.createTasa(token, codigoUsuario, codigoContribuyente, codigoClasificador, monto, observaciones)
  //  .subscribe(
  //     (response) => {
  //     },
  //     (error) => {
  //     }
  //   );
   createTasa(token: string, codigoUsuario: string, codigoContribuyente: string, codigoClasificador: string, monto: number, observaciones: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const requestData = {
      'codigoAlcaldia': 'QUI',
      'codigoUsuario': codigoUsuario,
      'codigoContribuyente': codigoContribuyente,
      'servicioMunicipal': '2174',
      'datosConcepto': [
        {
          'codigoClasificador': codigoClasificador,
          'tipoArancel': 'DI',
          'monto': monto
        }
      ],
      'observacion': observaciones
    };

    return this.http.post<any>(
      `${ruatUrl}/RuatServiciosWebTasasOI/tasasOI/registroTasa`,
      requestData,
      { headers }
    );
  }

  cancelTasa(token: string, codigoUsuario: string, nroTasa: number, motivo: string, observaciones: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const requestData = {
      'codigoAlcaldia': 'QUI',
      'codigoUsuario': codigoUsuario,
      'numeroTasa' : nroTasa,
      'tipoTasa' : 'TO',
      'motivoTasa': motivo,
      'observacion': observaciones
    };

    return this.http.post<any>(
      `${ruatUrl}/RuatServiciosWebTasasOI/tasasOI/registroTasa`,
      requestData,
      { headers }
    );
  }

  consultaPagoTasa(token: string, nroTasa: number){
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const requestData ={
      'codigoAlcaldia': 'QUI',
      'numeroTasa': nroTasa,
      'tipoTasa': 'TO'
    };

    return this.http.post<any>(
      `${ruatUrl}/RuatServiciosWebTasasOI/tasasOI/consultaPagoTasa`,
      requestData,
      { headers }
    );
  }
}
