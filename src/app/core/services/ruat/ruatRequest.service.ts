import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { Contribuyente } from '../../models/contribuyente.model';

const apiUrl = `${environment.backendUrl}/ruat`;

@Injectable({
  providedIn: 'root'
})
export class RuatRequestsService {

  constructor(
    private http: HttpClient,
  ) { }

  // Get token dynamically each time it's needed
  private getToken(): string | null {
    // Try both with and without window. prefix
    return sessionStorage.getItem('ruatToken') || window.sessionStorage.getItem('ruatToken');
  }

  // Add method to check if token is available
  isTokenAvailable(): boolean {
    return !!this.getToken();
  }

  authenticate(usuario: string, clave: string): Observable<any> {
    // No token needed for authentication
    const requestData = {
      'usuario': usuario,
      'clave': clave
    };
    return this.http.post<any>(`${apiUrl}/login`, requestData);
  }

  getContribuyentePorCi(codigoAlcaldia: string, numeroDocumento: string, tipoDocumento: string, expedido: string): Observable<any> {
    const token = this.getToken();
    if (!token) {
      throw new Error('RUAT token not available');
    }
    
    const requestData = {
      'token': token,
      'contribuyenteRequest': {
        'codigoAlcaldia': codigoAlcaldia,
        'numeroDocumento': numeroDocumento,
        'tipoDocumento': tipoDocumento,
        'expedido': expedido
      }
    };
    return this.http.post<any>(`${apiUrl}/buscar`, requestData);
  }

  registerContribuyente(codigoAlcaldia: string, codigoUsuario: string, data: Contribuyente): Observable<any> {
    const token = this.getToken();
    if (!token) {
      throw new Error('RUAT token not available');
    }
    
    const requestData = {
      'token': token,
      'registro': {
        codigoAlcaldia: codigoAlcaldia,
        codigoUsuario: codigoUsuario,
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
        motivo: "REGISTRO TASAS Y OTROS INGRESOS",
        observacion: "REGISTRO PARA DEPORTESAPP - GAMQ"
      }      
    };
    return this.http.post<any>(`${apiUrl}/registro`, requestData);
  }

  getDeudasContribuyente(codigoAlcaldia: string, tipoConsulta: string, nroDocumento: string, tipoDocumento: string): Observable<any> {
    const token = this.getToken();
    if (!token) {
      throw new Error('RUAT token not available');
    }
    
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

  createTasa(codigoAlcaldia: string, codigoUsuario: string, servicioMunicipal: string, data: any, codigoContribuyente: string): Observable<any> {    
    const token = this.getToken();
    if (!token) {
      throw new Error('RUAT token not available');
    }
    
    const requestData = {
      'token': token,
      'tasa': {
        codigoAlcaldia: codigoAlcaldia,
        codigoUsuario: codigoUsuario,
        codigoContribuyente: codigoContribuyente,
        servicioMunicipal: servicioMunicipal,
        datosConcepto: data.datosConcepto,
        observacion: data.observacion
      }
    };
    return this.http.post<any>(`${apiUrl}/creartasa`, requestData);
  }

  cancelTasa(codigoAlcaldia: string, codigoUsuario: string, data: any): Observable<any> {   
    const token = this.getToken();
    if (!token) {
      throw new Error('RUAT token not available');
    }
    
    const requestData = {
      'token': token,
      'anular': {
        'codigoAlcaldia': codigoAlcaldia,
        'codigoUsuario': codigoUsuario,
        'numeroTasa': data.numeroTasa,
        'tipoTasa': 'TO',
        'motivoTasa': data.motivo,
        'observacion': data.observacion
      }
    };
    return this.http.post<any>(`${apiUrl}/anulartasa`, requestData);
  }
  
  consultaPagoTasa(codigoAlcaldia: string, nroTasa: string): Observable<any> {
    const token = this.getToken();
    if (!token) {
      throw new Error('RUAT token not available');
    }
    
    const requestData = {
      'token': token,
      'pago': {
        'codigoAlcaldia': codigoAlcaldia,
        'numeroTasa': nroTasa,
        'tipoTasa': 'TO'
      }
    };
    return this.http.post<any>(`${apiUrl}/pago`, requestData);
  }

  setToken(token: string): void {
    sessionStorage.setItem('ruatToken', token);
    window.sessionStorage.setItem('ruatToken', token);
  }

  removeToken(): void {
    sessionStorage.removeItem('ruatToken');
    window.sessionStorage.removeItem('ruatToken');
  }
}