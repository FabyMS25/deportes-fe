import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { Contribuyente } from '../models/contribuyente.model';
import { apiPost } from './apiResponses';

const apiUrl = `${environment.backendUrl}/ruat`;

@Injectable({
  providedIn: 'root'
})
export class RuatRequestsService {

  constructor(
    private http: HttpClient,
  ) { }

  isTokenAvailable(): boolean {
    return true;
  }

  getResponsePayload(response: any): any {
    const payload = response?.payload ?? response?.error?.payload ?? response?.error ?? response;
    if (typeof payload !== 'string') {
      return payload;
    }

    try {
      return JSON.parse(payload);
    } catch {
      return { mensaje: payload };
    }
  }

  getResponseData(response: any): any {
    const payload = this.getResponsePayload(response);
    return payload?.datos ?? payload ?? {};
  }

  canContinue(response: any): boolean {
    const payload = this.getResponsePayload(response);
    return payload?.continuarFlujo === true || String(payload?.continuarFlujo).toLowerCase() === 'true';
  }

  getResponseMessage(response: any, fallback: string = 'Respuesta inesperada de RUAT'): string {
    const payload = this.getResponsePayload(response);
    const data = payload?.datos ?? {};
    return this.firstText(
      payload?.mensaje,
      data?.mensajeConfirmacion,
      data?.observacion,
      payload?.observacion,
      response?.mensaje,
      response?.message,
      fallback
    );
  }

  getOperationalErrorMessage(
    response: any,
    fallback: string = 'RUAT devolvió una respuesta inválida.'
  ): string {
    const message = this.getResponseMessage(response, fallback);
    const validation = this.getResponsePayload(response)?.detalle?.validacion;
    if (validation?.campo) {
      return `RUAT rechazó la solicitud: ${message}`;
    }
    return message;
  }

  private firstText(...values: any[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (Array.isArray(value)) {
        const nested = this.firstText(...value);
        if (nested) {
          return nested;
        }
      }
    }
    return '';
  }

  authenticate(): Observable<any> {
    return apiPost<any>(this.http, `${apiUrl}/login`, {}, 'autenticar RUAT');
  }

  getContribuyentePorCi(numeroDocumento: string, tipoDocumento: string, expedido: string): Observable<any> {
    const requestData = {
      'contribuyenteRequest': {
        'numeroDocumento': numeroDocumento,
        'tipoDocumento': tipoDocumento,
        'expedido': expedido
      }
    };
    return apiPost<any>(this.http, `${apiUrl}/buscar`, requestData, 'buscar contribuyente RUAT');
  }

  registerContribuyente(data: Contribuyente): Observable<any> {
    const requestData = {
      'registro': {
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
    return apiPost<any>(this.http, `${apiUrl}/registro`, requestData, 'registrar contribuyente RUAT');
  }

  getDeudasContribuyente(tipoConsulta: string, nroDocumento: string, tipoDocumento: string): Observable<any> {
    const requestData = {
      'tipoConsulta': tipoConsulta,
      'numeroDocumento': nroDocumento,
      'tipoDocumento': tipoDocumento
    };

    return apiPost<any>(
      this.http,
      `${apiUrl}/RuatServiciosWebTasasOI/tasasOI/consultaDeudaTasaContrib`,
      requestData,
      'consultar deuda RUAT'
    );
  }

  createTasa(data: any, codigoContribuyente: string): Observable<any> {
    const requestData = {
      'tasa': {
        codigoContribuyente: codigoContribuyente,
        datosConcepto: data.datosConcepto,
        observacion: data.observacion
      }
    };
    return apiPost<any>(this.http, `${apiUrl}/creartasa`, requestData, 'crear tasa RUAT');
  }

  cancelTasa(data: any): Observable<any> {
    const requestData = {
      'anular': {
        'numeroTasa': data.numeroTasa,
        'motivoTasa': data.motivo,
        'observacion': data.observacion
      }
    };
    return apiPost<any>(this.http, `${apiUrl}/anulartasa`, requestData, 'anular tasa RUAT');
  }
  
  consultaPagoTasa(nroTasa: string): Observable<any> {
    const requestData = {
      'pago': {
        'numeroTasa': nroTasa
      }
    };
    return apiPost<any>(this.http, `${apiUrl}/pago`, requestData, 'consultar pago RUAT');
  }

  setToken(_token: string): void {
  }

  removeToken(): void {
  }
}
