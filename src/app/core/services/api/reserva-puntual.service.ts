import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaPuntual } from '../../models/reservaPuntual.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

export interface ReservaPuntualFilters {
  revisarEstados?: boolean;
  tab?: number;
  searchTerm?: string;
  estadoReserva?: string;
  estadoValidacion?: string;
  categoria?: string;
  conOrganizacion?: boolean;
  tipoContribuyente?: string;
  tipoOrganizacion?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  fromDate?: string; // ISO
  toDate?: string;   // ISO
}

@Injectable({
  providedIn: 'root'
})
export class ReservaPuntualService {
  apiUrl = environment.backendUrl + '/reservas-puntuales';

  constructor(private http: HttpClient) { }

  getAll(
    page: number = 0,
    size: number = 20,
    filters?: ReservaPuntualFilters
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    return apiGet<any>(this.http, this.apiUrl, 'obtener reservas puntuales', { params });
  }
  
  checkExpiredReservations(): Observable<any> {
    return apiPost<any>(this.http, `${this.apiUrl}/verificar-expiradas`, null, 'verificar reservas puntuales expiradas');
  }
  
  validateScheduleChange(
    uuidCampo: string,
    fechaUso: string | Date,
    horaInicio: string,
    horaFin: string,
    excludeReservaUuid?: string
  ): Observable<any> {
    const fecha =
      typeof fechaUso === 'string'
        ? fechaUso
        : this.formatDateLocal(fechaUso);
    let params = new HttpParams()
      .set('campoUuid', uuidCampo)
      .set('fechaUso', fecha)
      .set('horaInicio', horaInicio.slice(0, 5))
      .set('horaFin', horaFin.slice(0, 5));

    if (excludeReservaUuid) {
      params = params.set('excludeReservaUuid', excludeReservaUuid);
    }

    return apiGet<any>(this.http, `${this.apiUrl}/conflictos`, 'validar cambio de horario puntual', { params });
  }

  private formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getByUuid(uuid: string): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/${uuid}`, `obtener reserva puntual (${uuid})`);
  }

  getByReservationUuid(reservaUuid: string): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/reserva/${reservaUuid}`, `obtener reserva puntual por reserva (${reservaUuid})`);
  }

  getByFechaUso(fechaUso: Date): Observable<any[]> {
    return apiGet<any[]>(this.http, `${this.apiUrl}/fecha-uso/${this.formatDateLocal(fechaUso)}`, 'obtener reservas puntuales por fecha de uso');
  }

  getByFieldAndDate(uuidCampo: string, fechaUso: Date): Observable<any[]> {
    return apiGet<any[]>(this.http, `${this.apiUrl}/campo/${uuidCampo}/fecha/${this.formatDateLocal(fechaUso)}`, `obtener reservas puntuales por campo (${uuidCampo})`);
  }

  getActiveByFieldAndDate(uuidCampo: string, fechaUso: Date): Observable<any[]> {
    return apiGet<any[]>(this.http, `${this.apiUrl}/activas/campo/${uuidCampo}/fecha/${this.formatDateLocal(fechaUso)}`, `obtener reservas puntuales activas por campo (${uuidCampo})`);
  }

  verificarConflictos(uuidCampo: string, fechaUso: Date, horaInicio: string, horaFin: string, excludeReservaUuid?: string): Observable<boolean> {
    let params = new HttpParams()
      .set('campoUuid', uuidCampo)
      .set('fechaUso', this.formatDateLocal(fechaUso))
      .set('horaInicio', horaInicio)
      .set('horaFin', horaFin);
    
    if (excludeReservaUuid) {
      params = params.set('excludeReservaUuid', excludeReservaUuid);
    }
    
    return apiGet<boolean>(this.http, `${this.apiUrl}/conflictos`, 'verificar conflictos de reserva puntual', { params });
  }

  create(data: any): Observable<any> {
    return apiPost<any>(this.http, this.apiUrl, data, 'crear reserva puntual');
  }

  update(data: any): Observable<any> {
    return apiPut<any>(this.http, `${this.apiUrl}/cambiar-horario`,
      { fechaUso: data.fechaUso, horaInicio: data.horaInicio, horaFin: data.horaFin, observaciones: data.observaciones },
      'cambiar horario de reserva puntual', { params: new HttpParams().set('uuid', data.uuid) });
  }

  registrarUsoReal(uuid: string, fechaUsoReal: Date): Observable<any> {
    let params = new HttpParams().set('fechaUsoReal', fechaUsoReal.toISOString());
    return apiPut<any>(this.http, `${this.apiUrl}/${uuid}/registrar-uso`, null, `registrar uso real (${uuid})`, { params });
  }

  delete(uuid: string): Observable<any> {
    return apiDelete<any>(this.http, `${this.apiUrl}/${uuid}`, `anular reserva puntual (${uuid})`);
  }
}
