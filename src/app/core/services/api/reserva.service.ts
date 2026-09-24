import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Reserva } from '../../models/reserva.model';
import { BookingType } from '../../constants/Features';
import { EstadoReserva } from '../../constants/Estados';
import Swal from 'sweetalert2';
import { ReservaRevision, PageResponse, apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';
import { AuthenticationService } from '../auth.service';

export interface ReservaFilters {
  revisarEstados?: boolean;
  tab?: number;
  searchTerm?: string; // to search on nombre of Contribuyente, nombre of Organization, nombre Campo deportivo, nro tasa, nro de reserva, motivo de rechazo , motivo de gratuitidad como ESCUELA_MUNICIPAL , 
  typeReserva?:string;//periodo|puntual|recurrente
  estadoReserva?: string;
  estadoValidacion?: string;
  esReservaGratuita?:boolean;
  organization?: string;
  periodoFiltro?:  {
    mesFiltro?: number;
    anioFiltro?: number;
  };
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class ReservaService {
  apiUrl = environment.backendUrl + '/reservas';

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService
  ) { }

  getAll(
    page: number = 0,
    size: number = 20,
    filters?: ReservaFilters
  ): Observable<PageResponse<Reserva>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          return;
        }
        if (key === 'periodoFiltro' && typeof value === 'object') {
          if (value.mesFiltro !== null && value.mesFiltro !== undefined) {
            params = params.set('mesFiltro', value.mesFiltro);
          }
          if (value.anioFiltro !== null && value.anioFiltro !== undefined) {
            params = params.set('anioFiltro', value.anioFiltro);
          }
        } else {
          params = params.set(key, String(value));
        }
      });
    }
    return apiGet<PageResponse<Reserva>>(this.http, this.apiUrl, 'obtener reservas', { params });
  }

  getByUuid(uuid: string): Observable<Reserva> {
    return apiGet<Reserva>(this.http, `${this.apiUrl}/${uuid}`, `obtener reserva (${uuid})`);
  }

  getByReservationNumber(numeroReserva: string): Observable<Reserva> {
    return apiGet<Reserva>(this.http, `${this.apiUrl}/numero/${numeroReserva}`, `obtener reserva por número (${numeroReserva})`);
  }

  getByReservationDate(fechaIni: Date, fechaFin: Date, page: number = 0, size: number = 20): Observable<PageResponse<Reserva>> {
    let params = new HttpParams()
      .set('fechaIni', this.formatDateTime(fechaIni))
      .set('fechaFin', this.formatDateTime(fechaFin))
      .set('page', page.toString())
      .set('size', size.toString());
    
    return apiGet<PageResponse<Reserva>>(this.http, `${this.apiUrl}/fechas`, 'obtener reservas por fecha', { params });
  }

  getBySportField(uuidCampo: string): Observable<Reserva[]> {
    return apiGet<Reserva[]>(this.http, `${this.apiUrl}/campo/${uuidCampo}`, `obtener reservas por campo (${uuidCampo})`);
  }

  getByTaxpayer(uuidContribuyente: string): Observable<any[]> {
    return apiGet<Reserva[]>(this.http, `${this.apiUrl}/contribuyente/${uuidContribuyente}`, `obtener reservas por contribuyente (${uuidContribuyente})`);
  }

  getByEstado(estadoReserva: string): Observable<any[]> {
    return apiGet<Reserva[]>(this.http, `${this.apiUrl}/estado/${estadoReserva}`, `obtener reservas por estado (${estadoReserva})`);
  }

  getByTipo(tipoReserva: string): Observable<any> {
    return apiGet<Reserva[]>(this.http, `${this.apiUrl}/tipo/${tipoReserva}`, `obtener reservas por tipo (${tipoReserva})`);
  }

  getActiveByFieldAndDate(uuidCampo: string, fechaIni: Date, fechaFin: Date): Observable<Reserva[]> {
    let params = new HttpParams()
      .set('fechaIni', this.formatDateTime(fechaIni))
      .set('fechaFin', this.formatDateTime(fechaFin));
    
    return apiGet<Reserva[]>(this.http, `${this.apiUrl}/activas/campo/${uuidCampo}`, `obtener reservas activas por campo (${uuidCampo})`, { params });
  }

  approveReservation(uuid: String, aprobadoPor: string): Observable<Reserva> {
    let params = new HttpParams().set('aprobadoPor', this.currentUserUuid() || aprobadoPor);
    return apiPut<Reserva>(this.http, `${this.apiUrl}/${uuid}/aprobar`, null, `aprobar reserva (${uuid})`, { params });
  }

  markNoShow(uuid: string, observacion = ''): Observable<Reserva> {
    return apiPut<Reserva>(this.http, `${this.apiUrl}/update-not-show`, null, 'registrar No Show', {
      params: new HttpParams().set('uuid', uuid).set('observacion', observacion)
    });
  }

  completeUsage(uuid: string): Observable<Reserva> {
    return apiPut<Reserva>(this.http, `${this.apiUrl}/completar`, null, 'confirmar uso completo', {
      params: new HttpParams().set('uuid', uuid)
    });
  }

  completeSchoolReservation(uuid: string): Observable<Reserva> {
    return apiPut<Reserva>(this.http, `${this.apiUrl}/completar-escuela`, null,
      'completar reserva base de escuela', { params: new HttpParams().set('uuid', uuid) });
  }

  rejectReservation(uuid: String, motivoRechazo: string, aprobadoPor: string): Observable<Reserva> {
    let params = new HttpParams()
      .set('motivoRechazo', motivoRechazo)
      .set('aprobadoPor', this.currentUserUuid() || aprobadoPor);
    
    return apiPut<Reserva>(this.http, `${this.apiUrl}/${uuid}/rechazar`, null, `rechazar reserva (${uuid})`, { params });
  }

  cancelReservation(uuid: string, motivo: string, observacion?: string): Observable<ReservaRevision['resultados'][number]> {
    let params = new HttpParams().set('motivo', motivo);
    if (observacion != null) params = params.set('observacion', observacion);
    const anuladoPor = this.currentUserUuid();
    if (anuladoPor) {
      params = params.set('anuladoPor', anuladoPor);
    }
    return apiPut<ReservaRevision['resultados'][number]>(this.http, `${this.apiUrl}/${uuid}/cancelar`, null, `cancelar reserva (${uuid})`, { params });
  }

  verificarConflictos(uuidCampo: string, fechaIni: Date, fechaFin: Date, excludeReservaUuid?: string): Observable<boolean> {
    let params = new HttpParams()
      .set('uuidCampo', uuidCampo)
      .set('fechaIni', fechaIni.toISOString())
      .set('fechaFin', fechaFin.toISOString());
    
    if (excludeReservaUuid) {
      params = params.set('excludeReservaUuid', excludeReservaUuid);
    }
    
    return apiGet<boolean>(this.http, `${this.apiUrl}/conflictos`, 'verificar conflictos de reserva', { params });
  }

  create(data: Reserva): Observable<Reserva> {
    const creadoPor = data.creadoPor || this.currentUserUuid();
    return apiPost<Reserva>(this.http, this.apiUrl, { ...data, creadoPor }, 'crear reserva');
  }

  update(data: Reserva): Observable<Reserva> {
    const updatedData: Reserva = { ...data };
    if (updatedData.estadoReserva === EstadoReserva.EXPIRADA) {
      updatedData.anuladoPor = null;
    }
    return apiPut<Reserva>(this.http, this.apiUrl, updatedData, 'actualizar reserva');
  }

  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `anular reserva (${uuid})`);
  }

  previewReservationNumber(tipoReserva: BookingType): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/numero-reserva/preview?tipo=${tipoReserva}`, `previsualizar número de reserva (${tipoReserva})`);
  }

  generateReservationNumber(tipoReserva: BookingType): Observable<string> {
    const params = new HttpParams().set('tipo', tipoReserva);
    return apiGet<string>(this.http, `${this.apiUrl}/numero-reserva/generar`, `generar número de reserva (${tipoReserva})`, { params });
  }

  validateReservationNumber(numeroReserva: string, tipoReserva: BookingType): Observable<any> {
    return apiPost<any>(
      this.http,
      `${this.apiUrl}/numero-reserva/validar`,
      { numeroReserva, tipoReserva },
      `validar número de reserva (${numeroReserva})`
    );
  }

  private currentUserUuid(): string {
    const user = this.authService.currentUser();
    return user?.uuid
      || user?.usuarioUuid
      || user?.userUuid
      || user?.designacion?.usuarioDto?.uuid
      || '';
  }

  checkReservationNumberAvailability(numeroReserva: string): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/numero-reserva/verificar/${numeroReserva}`, `verificar disponibilidad de número (${numeroReserva})`);
  }

  private formatDateTime(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
      + `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

}

export function reservationRevisionText(revision: ReservaRevision): string {
  const counts = [
    `Revisadas: ${revision.revisadas}`, `Actualizadas: ${revision.actualizadas}`,
    `Sin cambios: ${revision.sinCambios}`, `Fallidas: ${revision.fallidas}`,
    `Pendientes de revisión: ${revision.omitidas}`
  ].join(' · ');
  const details = revision.resultados.filter(item => item.resultado !== 'SIN_CAMBIOS').map(item => {
    const reserva = item.reservaDto;
    const id = reserva?.numeroReserva || 'Reserva sin número registrado';
    const tasa = reserva?.numeroTasa ? ` · Tasa ${reserva.numeroTasa}` : '';
    const state = item.estadoAnterior && reserva?.estadoReserva && item.estadoAnterior !== reserva.estadoReserva
      ? ` · ${item.estadoAnterior} → ${reserva.estadoReserva}` : '';
    const original = item.motivo ?? (item.respuestaRuat == null ? '' :
      typeof item.respuestaRuat === 'string' ? item.respuestaRuat : JSON.stringify(item.respuestaRuat));
    return [`${id}${tasa}: ${item.resultado}${state}`, original,
      item.detalleLocal ? `Sistema local: ${item.detalleLocal}` : ''].filter(Boolean).join('\n');
  });
  return ['Revisión de todas las reservas que requieren revisión dentro de su acceso.', counts, ...details].join('\n\n');
}

export async function showReservationRevision(revision?: ReservaRevision): Promise<void> {
  if (!revision) return;
  const tieneResultados = revision.resultados?.some(item =>
    ['ACTUALIZADA', 'ERROR', 'OMITIDA'].includes(item.resultado));
  if (!tieneResultados && !revision.actualizadas && !revision.fallidas && !revision.omitidas) return;
  const details = document.createElement('pre');
  details.textContent = reservationRevisionText(revision);
  details.style.cssText = 'white-space:pre-wrap;text-align:left;font:inherit;max-height:50vh;overflow:auto';
  await Swal.fire({
    title: revision.completa ? 'Revisión de reservas' : 'Revisión de reservas incompleta',
    icon: revision.completa ? 'info' : 'warning',
    html: details,
    confirmButtonText: 'Entendido',
    allowOutsideClick: false,
    allowEscapeKey: false,
    width: 480
  });
}
