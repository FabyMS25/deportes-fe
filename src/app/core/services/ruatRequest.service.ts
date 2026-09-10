import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { Contribuyente } from '../models/contribuyente.model';

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

  hasBusinessResponse(response: any): boolean {
    const payload = this.getResponsePayload(response);
    const value = String(payload?.continuarFlujo).toLowerCase();
    return value === 'true' || value === 'false';
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
      if (value && typeof value === 'object') {
        const nested = this.firstText(...Object.values(value));
        if (nested) {
          return nested;
        }
      }
    }
    return '';
  }

  authenticate(): Observable<any> {
    return this.ruatPost(`${apiUrl}/login`, {});
  }

  getTaxpayerByIdentityNumber(numeroDocumento: string, tipoDocumento: string, expedido: string): Observable<any> {
    const requestData = {
      'contribuyenteRequest': {
        'numeroDocumento': numeroDocumento,
        'tipoDocumento': tipoDocumento,
        'expedido': expedido
      }
    };
    return this.ruatPost(`${apiUrl}/buscar`, requestData);
  }

  registerTaxpayer(data: Contribuyente): Observable<any> {
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
    return this.ruatPost(`${apiUrl}/registro`, requestData);
  }

  getTaxpayerDebts(tipoConsulta: string, nroDocumento: string, tipoDocumento: string): Observable<any> {
    const requestData = {
      'tipoConsulta': tipoConsulta,
      'numeroDocumento': nroDocumento,
      'tipoDocumento': tipoDocumento
    };

    return this.ruatPost(
      `${apiUrl}/RuatServiciosWebTasasOI/tasasOI/consultaDeudaTasaContrib`,
      requestData
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
    return this.ruatPost(`${apiUrl}/creartasa`, requestData);
  }

  cancelTasa(data: any): Observable<any> {
    const requestData = {
      'anular': {
        'numeroTasa': data.numeroTasa,
        'motivoTasa': data.motivo,
        'observacion': data.observacion
      }
    };
    return this.ruatPost(`${apiUrl}/anulartasa`, requestData);
  }
  
  checkFeePayment(nroTasa: string): Observable<any> {
    const requestData = {
      'pago': {
        'numeroTasa': nroTasa
      }
    };
    return this.ruatPost(`${apiUrl}/pago`, requestData);
  }

  setToken(_token: string): void {
  }

  removeToken(): void {
  }

  private ruatPost(url: string, body: unknown): Observable<any> {
    return this.http.post<any>(url, body).pipe(
      map(response => response?.payload ?? response),
      catchError(error => this.isRuatBusinessError(error)
        ? of(this.getResponsePayload(error))
        : throwError(() => error))
    );
  }

  private isRuatBusinessError(error: any): boolean {
    const status = Number(error?.status);
    return status >= 400 && status < 500 && this.hasBusinessResponse(error);
  }
}
