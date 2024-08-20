
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalComponent } from "../../../global-component";
import { Contribuyente } from '../../models/contribuyente.models';

const apiUrl = `${environment.backendUrl}/ruat`;

const token = GlobalComponent.RUAT_token;
const codigoAlcaldia = GlobalComponent.RUAT_codigoAlcaldia;
const codigoUsuario = GlobalComponent.RUAT_codigoUsuario;
@Injectable({
  providedIn: 'root'
})
export class RuatRequestsService {

  constructor(
    private http: HttpClient,
  ) { }

  authenticate(): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    const username=GlobalComponent.RUAT_usuario;
    const password=GlobalComponent.RUAT_clave;
    const requestData = {
      'usuario': username,
      'clave': password
    };
    return this.http.post<any>(`${apiUrl}/login`, requestData);
  }


  getContribuyentePorCi( nroDocumento: string, tipoDocumento: string,expedido:string): Observable<any> {
    const requestData = {
      'token': token,
      'contribuyenteRequest': {
        'codigoAlcaldia': codigoAlcaldia,
        'numeroDocumento': nroDocumento,
        'tipoDocumento': tipoDocumento,
        'expedido': expedido
      }
    };
    return this.http.post<any>(`${apiUrl}/buscar`, requestData, );
  }

  registerContribuyente(data:Contribuyente): Observable<any> {
    const requestData = {
      'token': token,
      'registro':{
        codigoAlcaldia: codigoAlcaldia,
        codigoUsuario: codigoUsuario,
    
        numeroDocumento: data.nroCarnet,
        tipoDocumento: data.tipoDocumento,
        expedido: data.ciExpedido,
        nombre: data.nombre,
        primerApellido: data.apPaterno,
        segundoApellido: data.apMaterno,
        estadoCivil: data.estadoCivil,
        fechaNacimiento: data.fechaNac,
        genero: data.sexo,
        apellidoEsposo: "",  
        motivo:"REGISTRO TASAS Y OTROS INGRESOS",
        observacion: "REGISTRO PARA DEPORTESAPP - GAMQ"
      }      
    };
    return this.http.post<any>(`${apiUrl}/registro`,requestData, );
  }

  
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
      `${apiUrl}/RuatServiciosWebTasasOI/tasasOI/consultaDeudaTasaContrib`,
      requestData,
      { headers }
    );
  }
  


/* ------API REST RUAT TASAS y OTROS SERVICIOS -------*/
   createTasa(data:any): Observable<any> {
    
    const requestData = {
      'token':token,
      'tasa': {
        codigoAlcaldia: codigoAlcaldia,
        codigoUsuario: codigoUsuario,
        codigoContribuyente: data.codigoContribuyente,
        servicioMunicipal: '2174',
        datosConcepto: [
          {
            codigoClasificador:"29156",
            tipoArancel: 'DI',
            monto: data.monto
          }
        ],
        observacion: data.observacion
      }
    };

    return this.http.post<any>(`${apiUrl}/creartasa`,requestData, );
  }

  cancelTasa( codigoUsuario: string, nroTasa: number, motivo: string, observaciones: string): Observable<any> {
   
    const requestData = {
      'token':token,
      'anular': {
        'codigoAlcaldia': 'QUI',
        'codigoUsuario': codigoUsuario,
        'numeroTasa' : nroTasa,
        'tipoTasa' : 'TO',
        'motivoTasa': motivo,
        'observacion': observaciones
      }
    };

    return this.http.post<any>(`${apiUrl}/anulartasa`,requestData, );
  }

  consultaPagoTasa( nroTasa: number): Observable<any> {

    const requestData = {
      'token':token,
      'pago': {
        'codigoAlcaldia': 'QUI',
        'numeroTasa': nroTasa,
        'tipoTasa': 'TO'
      }
    };

    return this.http.post<any>(`${apiUrl}/pago`,requestData, );
  }
}
