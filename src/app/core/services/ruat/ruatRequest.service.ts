
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalComponent } from "../../../global-component";
import { Contribuyente } from '../../models/contribuyente.models';

const apiUrl = `${environment.backendUrl}/ruat`;

const token = GlobalComponent.RUAT_token;
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


  getContribuyentePorCi( numeroDocumento: string, tipoDocumento: string,expedido:string): Observable<any> {
    const requestData = {
      'token': token,
      'contribuyenteRequest': {
        'codigoAlcaldia': GlobalComponent.RUAT_codigoAlcaldia,
        'numeroDocumento': numeroDocumento,
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
        codigoAlcaldia: GlobalComponent.RUAT_codigoAlcaldia,
        codigoUsuario: GlobalComponent.RUAT_codigoUsuario,
    
        numeroDocumento: data.numeroDocumento,
        tipoDocumento: data.tipoDocumento,
        expedido: data.expedido,
        nombre: data.nombre,
        primerApellido: data.primerApellido,
        segundoApellido: data.segundoApellido,
        estadoCivil: data.estadoCivil,
        fechaNacimiento: data.fechaNacimiento,
        genero: data.genero,
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
      'codigoAlcaldia': GlobalComponent.RUAT_codigoAlcaldia,
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
   createTasa(data:any, codigoContribuyente:string): Observable<any> {    
    const requestData = {
      'token':token,
      'tasa': {
        codigoAlcaldia: GlobalComponent.RUAT_codigoAlcaldia,
        codigoUsuario: GlobalComponent.RUAT_codigoUsuario ,
        codigoContribuyente: codigoContribuyente,
        servicioMunicipal: GlobalComponent.RUAT_servicioMunicipal,
        datosConcepto: data.datosConcepto,
        observacion: data.observacion
      }
    };
    return this.http.post<any>(`${apiUrl}/creartasa`,requestData, );
  }

  cancelTasa( data:any): Observable<any> {   
    const requestData = {
      'token':token,
      'anular': {
        'codigoAlcaldia': GlobalComponent.RUAT_codigoAlcaldia,
        'codigoUsuario': GlobalComponent.RUAT_codigoUsuario,
        'numeroTasa' : data.numeroTasa,
        'tipoTasa' : 'TO',
        'motivoTasa': data.motivo,
        'observacion': data.observacion
      }
    };
    return this.http.post<any>(`${apiUrl}/anulartasa`,requestData, );
  }
  
  consultaPagoTasa( nroTasa: number): Observable<any> {
    const requestData = {
      'token':token,
      'pago': {
        'codigoAlcaldia': GlobalComponent.RUAT_codigoAlcaldia,
        'numeroTasa': nroTasa,
        'tipoTasa': 'TO'
      }
    };
    return this.http.post<any>(`${apiUrl}/pago`,requestData, );
  }
}
