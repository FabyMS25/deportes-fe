import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Reserva } from '../../models/reserva.model';
import { BookingType } from '../../constants/Features';
import { ApiResponse, PageResponse } from '../apiResponses';

export interface ReservaFilters {
  tab?: number;
  searchTerm?: string; // to search on nombre of Contribuyente, nombre of Organization, nombre Campo deportivo, nro tasa, nro de reserva, motivo de rechazo , motivo de gratuitidad como ESCUELA_MUNICIPAL , 
  typeReserva?:string;//periodo|puntual|recurrente
  estadoReserva?: string;
  estadoValidacion?: string;
  esReservaGratuita?:boolean;
  organization?: string;//  escuelaFiltro?: string;
  periodoFiltro?:  {
    mesFiltro?: number;
    anioFiltro?: number;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ReservaService {
  apiUrl = environment.backendUrl + '/reservas';

  constructor(private http: HttpClient) { }

  getAll(
    page: number = 0,
    size: number = 20,
    filters?: ReservaFilters
  ): Observable<ApiResponse<PageResponse<Reserva>>> {
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
    return this.http.get<ApiResponse<PageResponse<Reserva>>>(this.apiUrl, { params });
  }

  getByUuid(uuid: string): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.apiUrl}/${uuid}`);
  }

  getByNumeroReserva(numeroReserva: string): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.apiUrl}/numero/${numeroReserva}`);
  }

  getByFechaReserva(fechaIni: Date, fechaFin: Date, page: number = 0, size: number = 20): Observable<Reserva[]> {
    let params = new HttpParams()
      .set('fechaIni', fechaIni.toISOString())
      .set('fechaFin', fechaFin.toISOString())
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<Reserva[]>(`${this.apiUrl}/buscar/fechas`, { params });
  }

  getByCampoDeportivo(uuidCampo: string): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/campo/${uuidCampo}`);
  }

  getByContribuyente(uuidContribuyente: string): Observable<any[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/contribuyente/${uuidContribuyente}`);
  }

  getByEstado(estadoReserva: string): Observable<any[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/estado/${estadoReserva}`);
  }

  getByTipo(tipoReserva: string): Observable<any> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/tipo/${tipoReserva}`);
  }

  getActivasByCampoYFecha(uuidCampo: string, fechaIni: Date, fechaFin: Date): Observable<Reserva[]> {
    let params = new HttpParams()
      .set('fechaIni', fechaIni.toISOString())
      .set('fechaFin', fechaFin.toISOString());
    
    return this.http.get<Reserva[]>(`${this.apiUrl}/activas/campo/${uuidCampo}`, { params });
  }

  aprobarReserva(uuid: String, aprobadoPor: string): Observable<Reserva> {
    let params = new HttpParams().set('aprobadoPor', aprobadoPor);
    return this.http.put<Reserva>(`${this.apiUrl}/${uuid}/aprobar`, null, { params });
  }

  rechazarReserva(uuid: String, motivoRechazo: string, aprobadoPor: string): Observable<Reserva> {
    let params = new HttpParams()
      .set('motivoRechazo', motivoRechazo)
      .set('aprobadoPor', aprobadoPor);
    
    return this.http.put<Reserva>(`${this.apiUrl}/${uuid}/rechazar`, null, { params });
  }

  cancelarReserva(uuid: string, motivo: string): Observable<Reserva> {
    let params = new HttpParams().set('motivo', motivo);
    return this.http.put<Reserva>(`${this.apiUrl}/${uuid}/cancelar`, null, { params });
  }

  verificarConflictos(uuidCampo: string, fechaIni: Date, fechaFin: Date, excludeReservaUuid?: string): Observable<boolean> {
    let params = new HttpParams()
      .set('uuidCampo', uuidCampo)
      .set('fechaIni', fechaIni.toISOString())
      .set('fechaFin', fechaFin.toISOString());
    
    if (excludeReservaUuid) {
      params = params.set('excludeReservaUuid', excludeReservaUuid);
    }
    
    return this.http.get<boolean>(`${this.apiUrl}/verificar/conflictos`, { params });
  }

  create(data: Reserva): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.apiUrl}`, data);
  }

  update(data: Reserva): Observable<Reserva> {
    return this.http.put<Reserva>(`${this.apiUrl}`, data);
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }

  countByEstado(estadoReserva: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/contador/estado/${estadoReserva}`);
  }

  countByCampoYEstado(uuidCampo: string, estadoReserva: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/contador/campo/${uuidCampo}/estado/${estadoReserva}`);
  }

  verificarRequisitosAprobacion(uuidCampo: string, reservaData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/campo/${uuidCampo}/verificar-aprobacion`, reservaData);
  }

  previewNumeroReserva(tipoReserva: BookingType): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/numero-reserva/preview?tipo=${tipoReserva}`);
  }

  generateNumeroReserva(tipoReserva: BookingType): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/numero-reserva/generar`, { tipoReserva });
  }

  validateNumeroReserva(numeroReserva: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/numero-reserva/validar`, numeroReserva);
  }

  verificarDisponibilidadNumeroReserva(numeroReserva: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/numero-reserva/verificar/${numeroReserva}`);
  }

}
