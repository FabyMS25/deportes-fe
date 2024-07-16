
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalComponent } from "../../../global-component";
const ruatUrl = `${environment.apiRuatUrl}`;
const token = GlobalComponent.RUAT_token;
const codigoAlcaldia = GlobalComponent.RUAT_codigoAlcaldia;

@Injectable({
  providedIn: 'root'
})
export class RuatService {

  constructor(
    private http: HttpClient,
  ) { }

  getContribuyentePorCi( nroDocumento: string, tipoDocumento: string,expedido:string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const requestData = {
      'codigoAlcaldia': codigoAlcaldia,
      'numeroDocumento': nroDocumento,
      'tipoDocumento': tipoDocumento,
      'expedido': expedido
    };
    console.log(headers, requestData)

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
      'codigoAlcaldia': codigoAlcaldia,
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


  registerContribuyente(data:any): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<any>(
      `${ruatUrl}/RuatServiciosWebTasasOI/tasasOI/consultaDeudaTasaContrib`,
      data,
      { headers }
    );
  }

  

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
