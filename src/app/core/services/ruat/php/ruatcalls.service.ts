import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { GlobalComponent } from "../../../../global-component";
import { environment } from 'src/environments/environment';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';

const ruatUrl = `${environment.apiRuatUrl}`;

const token = GlobalComponent.RUAT_token;
const codigoAlcaldia = GlobalComponent.RUAT_codigoAlcaldia;
const codigoUsuario = GlobalComponent.RUAT_codigoUsuario;

@Injectable({
  providedIn: 'root'
})
export class RuatCallsService {
  private apiUrl = 'http://php-backend.test/api';

  constructor(private http: HttpClient) { }

  authenticate(): Observable<any> {
    return this.http.get(`${this.apiUrl}/authenticate`);
  }

  getContribuyentePorCi(nroDocumento: string, tipoDocumento: string, expedido: string): Observable<any> {
  
    const requestData = {
      'nroDocumento': nroDocumento,
      'tipoDocumento': tipoDocumento,
      'expedido': expedido,
      'token': token, 
      'codigoAlcaldia': codigoAlcaldia 
    };
    
    return this.http.post<any>(
    `${this.apiUrl}/getContribuyentePorCi`,
      requestData
    );
  }

  formatDate(date: Date): string {
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
      fechaNacimiento: this.formatDate(data.fechaNacimiento),
      genero: data.sexo,
      apellidoEsposo: "",  
      motivo:"REGISTRO TASAS Y OTROS INGRESOS",
      observacion: "REGISTRO PARA DEPORTESAPP - GAMQ"
    }
    console.log(contribuyente)
    return this.http.post<any>(
      `${this.apiUrl}/registerContribuyente`,
      contribuyente,
      { headers }
    );
  }

}