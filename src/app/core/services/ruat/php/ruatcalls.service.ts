import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { GlobalComponent } from "../../../../global-component";
import { environment } from 'src/environments/environment';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';

const apiUrl = 'http://php-backend.test/api';

const token = GlobalComponent.RUAT_token;
const codigoAlcaldia = GlobalComponent.RUAT_codigoAlcaldia;
const codigoUsuario = GlobalComponent.RUAT_codigoUsuario;

@Injectable({
  providedIn: 'root'
})
export class RuatCallsService {

  constructor(private http: HttpClient) { }

  authenticate(): Observable<any> {
    return this.http.get(`${apiUrl}/authenticate`);
  }



  getContribuyentePorCi(nroDocumento: string, tipoDocumento: string, expedido: string): Observable<any> {
  
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const requestData = {
      'numeroDocumento': nroDocumento,
      'tipoDocumento': tipoDocumento,
      'expedido': expedido,
      // 'token': token, 
      'codigoAlcaldia': codigoAlcaldia 
    };
    
    return this.http.post<any>(
    `${apiUrl}/getContribuyentePorCi`,
      requestData,
      { headers }
    );
  }

  registerContribuyente(data:Contribuyente): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });


    const contribuyente={
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
    console.log(contribuyente)
    return this.http.post<any>(
      `${apiUrl}/registerContribuyente`,
      contribuyente,
      { headers }
    );
  }

}