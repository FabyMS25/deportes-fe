import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { Contribuyente } from '../models/contribuyente.model';
import { Reserva } from '../models/reserva.model';
import { PagoService } from './api/pago.service';

export interface ReservationPaymentConsultation {
  reservaDto?: Reserva;
  type: 'success' | 'warning' | 'error' | 'info';
  text: string;
  pagoData?: any;
  detalleLocal?: string;
}

const apiUrl = `${environment.backendUrl}/ruat`;

@Injectable({
  providedIn: 'root'
})
export class RuatRequestsService {

  constructor(
    private http: HttpClient,
    private pagoService: PagoService,
  ) { }

  async consultReservationPayment(reserva: Reserva | undefined): Promise<ReservationPaymentConsultation> {
    if (!reserva?.numeroTasa) return {
      reservaDto: reserva, type: 'warning', text: 'La reserva no tiene número de tasa para consultar.'
    };
    let response: any;
    try {
      try {
        response = await this.checkFeePayment(reserva.numeroTasa).toPromise();
      } catch (error) {
        if (!this.isUnpaidPaymentResponse(error)) throw error;
        response = this.getResponsePayload(error);
      }
      if (this.isUnpaidPaymentResponse(response)) return {
        reservaDto: reserva, type: 'info', text: this.getResponseMessage(response, '')
      };
      if (!this.canContinue(response)) return {
        reservaDto: reserva, type: 'warning',
        text: this.getResponseMessage(response, '')
      };
      const data = this.getResponseData(response);
      if (!data || !Object.prototype.hasOwnProperty.call(data, 'pagoTasa')) return {
        reservaDto: reserva, type: 'error', text: this.getResponseMessage(response, ''),
        detalleLocal: 'La respuesta no contiene el campo pagoTasa.'
      };
      const pago = data.pagoTasa;
      if (pago == null) return { reservaDto: reserva, type: 'info',
        text: this.getResponseMessage(response, '') };

      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(pago.fechaPago));
      const fecha = match ? new Date(+match[3], +match[2] - 1, +match[1], 12) : undefined;
      const monto = Number(pago.montoPago);
      if (String(pago.numeroTasa) !== String(reserva.numeroTasa) || !pago.folio ||
          !fecha || fecha.getFullYear() !== +match![3] || fecha.getMonth() !== +match![2] - 1 ||
          fecha.getDate() !== +match![1] || pago.montoPago == null || pago.montoPago === '' ||
          !Number.isFinite(monto) || monto < 0) {
        return { reservaDto: reserva, type: 'error',
          text: this.getResponseMessage(response, ''),
          detalleLocal: 'Los datos recibidos no permiten registrar un pago válido para esta tasa.' };
      }
      const exists = reserva.pagosDtoList?.some(p => p.folio === pago.folio &&
        String(p.numeroTasa) === String(pago.numeroTasa));
      if (!exists) {
        const saved = await this.pagoService.save({
          numeroTasa: pago.numeroTasa, tipoTasa: 'TO', folio: pago.folio,
          formaPago: pago.formaPago, fechaPago: fecha, entidadFinanciera: pago.entidadFinanciera,
          montoPagado: monto, observaciones: pago.observacion, estadoPago: 'PAGADO',
          ultimaConsulta: new Date(), respuestaCompletaRuat: JSON.stringify(response),
          reservaDto: { uuid: reserva.uuid }
        }).toPromise();
        if (!saved || saved.folio !== pago.folio || String(saved.numeroTasa) !== String(pago.numeroTasa)) {
          throw new Error('El servidor no confirmó el registro local del pago consultado.');
        }
        reserva.pagosDtoList = [...(reserva.pagosDtoList || []), saved];
      }
      return { reservaDto: reserva, type: 'success', pagoData: pago,
        text: this.getResponseMessage(response, '') };
    } catch (error) {
      return { reservaDto: reserva, type: 'error',
        text: this.getResponseMessage(response ?? error, ''),
        detalleLocal: response ? 'No se completó el registro local del pago.' : undefined };
    }
  }

  isUnpaidPaymentResponse(response: any): boolean {
    if (response instanceof HttpErrorResponse && (response.status !== 404 ||
        ['ruat-be', 'deportes-be'].includes(response.headers?.get('X-Response-Origin')?.toLowerCase() ?? ''))) return false;
    const payload = this.getResponsePayload(response);
    if (['ruat-be', 'deportes-be'].includes(String(payload?.detalle?.origen).toLowerCase())) return false;
    const data = payload?.datos ?? payload;
    // These are payment-query results, not permission to continue a create/annul operation.
    const unpaidMessages = [
      'No Existe el registro de la tasa y otro ingreso.',
      'La Tasa y Otro Ingreso no tiene pagos realizados.'
    ];
    const message = payload?.mensaje ?? data?.mensaje;
    return String(payload?.continuarFlujo).toLowerCase() === 'false' &&
      typeof message === 'string' && unpaidMessages.includes(message.trim()) &&
      !!data && Object.prototype.hasOwnProperty.call(data, 'pagoTasa') && data.pagoTasa === null;
  }

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
      return payload;
    }

    const data = payload?.datos ?? {};
    return this.firstText(
      payload?.mensaje,
      data?.mensaje,
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
        return value;
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
