import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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

  getResponsePayload(response: any): any {
    const candidates = [response instanceof HttpErrorResponse ? response.error : response];

    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) {
        continue;
      }

      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (!trimmed) {
          return candidate;
        }

        const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}'))
          || (trimmed.startsWith('[') && trimmed.endsWith(']'));

        if (!looksLikeJson) {
          return candidate;
        }

        try {
          return JSON.parse(trimmed);
        } catch {
          return candidate;
        }
      }

      if (typeof candidate === 'object') {
        return candidate;
      }
    }

    return response;
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

    if (typeof payload === 'string' && payload.trim()) {
            // Decode entities for plain-text presentation only; never render upstream HTML.
      return payload.replace(/&(?:quot|apos|amp|lt|gt|#39|#34);/g, entity => ({
        '&quot;': '"', '&apos;': "'", '&amp;': '&', '&lt;': '<', '&gt;': '>', '&#39;': "'", '&#34;': '"'
      }[entity] ?? entity));
    }

    const data = payload?.datos ?? {};
    return this.firstText(
      payload?.mensaje,
      payload?.mensajeConfirmacion,
      data?.mensajeConfirmacion,
      data?.observacion,
      payload?.observacion,
      response?.mensaje,
      response?.message,
      fallback
    );
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

  createTasa(data: any, codigoContribuyente: string): Observable<any> {
    const requestData = {
      'tasa': {
        codigoContribuyente: codigoContribuyente,
        datosConcepto: data.datosConcepto.map((concept: any) => ({
          codigoClasificador: concept.codigoClasificador,
          tipoArancel: concept.tipoArancel,
          monto: concept.monto
        })),
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

  private ruatPost(url: string, body: unknown): Observable<any> {
    return this.http.post(url, body, { responseType: 'text' }).pipe(
      map(response => this.getResponsePayload(response))
    );
  }

}
