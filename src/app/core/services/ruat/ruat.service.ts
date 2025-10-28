
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalComponent } from "../../../global-component";
const ruatUrl = `${environment.backendRuat}`;
const token = sessionStorage.getItem('ruatToken');//GlobalComponent.RUAT_token;
const codigoAlcaldia = 'QUI';


    /* RUAT CREDENTIALS PRODUCTION */
    // apiRuatUrl: "https://aplicaciones.ruat.gob.bo",
    // RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    // RUAT_clave: "Gam#1209",
    // RUAT_codigoUsuario: "ERODRIGUEZ2.QUI",
    /* RUAT CREDENTIALS TEST */
    // apiRuatUrl: "https://consolidacionjboss.ruat.gob.bo", 
  const RUAT_usuario= "SWTRAMITESURKUPINIAQUI";
  const RUAT_clave= "S1234567";
  const RUAT_codigoUsuario= "PRUEBAS_1.QUI"; 
  const RUAT_passwordUsuario= "Ruat_123$";
@Injectable({
  providedIn: 'root'
})
export class RuatService {

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
    const username = RUAT_usuario;// GlobalComponent.RUAT_usuario;
    const password = RUAT_passwordUsuario;// GlobalComponent.RUAT_clave;
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
  
  getContribuyentePorCi( numeroDocumento: string, tipoDocumento: string,expedido:string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const requestData = {
      'codigoAlcaldia': codigoAlcaldia,
      'numeroDocumento': numeroDocumento,
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
