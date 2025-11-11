
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { Contribuyente } from '../../models/contribuyente.model';
import { GlobalComponent } from 'src/app/global-component';

const apiUrl = `${environment.backendUrl}/ruat`;

const token = sessionStorage.getItem('ruatToken');
@Injectable({
  providedIn: 'root'
})
export class RuatRequestsService {

  constructor(
    private http: HttpClient,
  ) { }

  authenticate(usuario:string,clave:string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    const username=usuario;//GlobalComponent.RUAT_usuario;
    const password=clave;//GlobalComponent.RUAT_clave;
    const requestData = {
      'usuario': username,
      'clave': password
    };
    return this.http.post<any>(`${apiUrl}/login`, requestData);
  }

  getContribuyentePorCi( codigoAlcaldia:string, numeroDocumento: string, tipoDocumento: string,expedido:string): Observable<any> {
    const requestData = {
      'token': token,
      'contribuyenteRequest': {
        'codigoAlcaldia': codigoAlcaldia,//GlobalComponent.RUAT_codigoAlcaldia,
        'numeroDocumento': numeroDocumento,
        'tipoDocumento': tipoDocumento,
        'expedido': expedido
      }
    };
    return this.http.post<any>(`${apiUrl}/buscar`, requestData, );
  }

  registerContribuyente(codigoAlcaldia:string,codigoUsuario:string,data:Contribuyente): Observable<any> {
    const requestData = {
      'token': token,
      'registro':{
        codigoAlcaldia: codigoAlcaldia,//GlobalComponent.RUAT_codigoAlcaldia,
        codigoUsuario: codigoUsuario,//GlobalComponent.RUAT_codigoUsuario,
    
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

  
  getDeudasContribuyente(token: string,codigoAlcaldia:string, tipoConsulta: string, nroDocumento: string, tipoDocumento: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const requestData = {
      'codigoAlcaldia':codigoAlcaldia,// GlobalComponent.RUAT_codigoAlcaldia,
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
   createTasa(codigoAlcaldia:string,codigoUsuario:string,servicioMunicipal:string,data:any, codigoContribuyente:string): Observable<any> {    
    const requestData = {
      'token':token,
      'tasa': {
        codigoAlcaldia: codigoAlcaldia,//GlobalComponent.RUAT_codigoAlcaldia,
        codigoUsuario: codigoUsuario,//GlobalComponent.RUAT_codigoUsuario ,
        codigoContribuyente: codigoContribuyente,
        servicioMunicipal: servicioMunicipal,//GlobalComponent.RUAT_servicioMunicipal,
        datosConcepto: data.datosConcepto,
        observacion: data.observacion
      }
    };
    return this.http.post<any>(`${apiUrl}/creartasa`,requestData, );
  }

  cancelTasa( codigoAlcaldia:string,codigoUsuario:string,data:any): Observable<any> {   
    const requestData = {
      'token':token,
      'anular': {
        'codigoAlcaldia': codigoAlcaldia,//GlobalComponent.RUAT_codigoAlcaldia,
        'codigoUsuario': codigoUsuario,//GlobalComponent.RUAT_codigoUsuario,
        'numeroTasa' : data.numeroTasa,
        'tipoTasa' : 'TO',
        'motivoTasa': data.motivo,
        'observacion': data.observacion
      }
    };
    return this.http.post<any>(`${apiUrl}/anulartasa`,requestData, );
  }
  
  consultaPagoTasa( codigoAlcaldia:string,nroTasa: string ): Observable<any> {
    const requestData = {
      'token':token,
      'pago': {
        'codigoAlcaldia': codigoAlcaldia,//GlobalComponent.RUAT_codigoAlcaldia,
        'numeroTasa': nroTasa,
        'tipoTasa': 'TO'
      }
    };
    return this.http.post<any>(`${apiUrl}/pago`,requestData, );
  }
}
