import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaRecurrente } from '../../models/reservaRecurrente.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

export interface ReservaRecurrenteFilters {
  tab?: number;
  searchTerm?: string;
  estadoReserva?: string;
  estadoValidacion?: string;
  categoria?: string;
  tipoRecurrencia?: string ,
  activo?: string ,
  fromDate?: string; // ISO
  toDate?: string;   // ISO
}

@Injectable({
  providedIn: 'root'
})
export class ReservaRecurrenteService {
  apiUrl = environment.backendUrl + '/reservas-recurrentes';

  constructor(private http: HttpClient) { }
  
  getAll(
    page: number = 0,
    size: number = 20,
    filters?: ReservaRecurrenteFilters
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
    return apiGet<any>(this.http, this.apiUrl, 'obtener reservas recurrentes', { params });
  }

  checkExpiredReservations(): Observable<any> {
    return apiPost<any>(this.http, `${this.apiUrl}/verificar-expiradas`, null, 'verificar reservas recurrentes expiradas');
  }
  
  getByUuid(uuid: string): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/${uuid}`, `obtener reserva recurrente (${uuid})`);
  }

  getByReservaUuid(reservaUuid: string): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/reserva/${reservaUuid}`, `obtener reserva recurrente por reserva (${reservaUuid})`);
  }

  getByTipoRecurrencia(tipoRecurrencia: string): Observable<any[]> {
    return apiGet<any[]>(this.http, `${this.apiUrl}/tipo/${tipoRecurrencia}`, `obtener reservas recurrentes por tipo (${tipoRecurrencia})`);
  }

  getActivas(): Observable<any[]> {
    return apiGet<any[]>(this.http, `${this.apiUrl}/activas/vigentes`, 'obtener reservas recurrentes activas');
  }

  getActivasByCampoYFecha(uuidCampo: string, fecha: Date): Observable<any[]> {
    return apiGet<any[]>(
      this.http,
      `${this.apiUrl}/activas/campo/${uuidCampo}/fecha/${this.formatDateLocal(fecha)}`,
      `obtener reservas recurrentes activas por campo (${uuidCampo})`
    );
  }

  getActivasEnFecha(fecha: Date): Observable<any[]> {
    return apiGet<any[]>(this.http, `${this.apiUrl}/activas/fecha/${this.formatDateLocal(fecha)}`, 'obtener reservas recurrentes activas por fecha');
  }

  private formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  activar(uuid: string): Observable<any> {
    return apiPut<any>(this.http, `${this.apiUrl}/${uuid}/activar`, null, `activar reserva recurrente (${uuid})`);
  }

  desactivar(uuid: string): Observable<any> {
    return apiPut<any>(this.http, `${this.apiUrl}/${uuid}/desactivar`, null, `desactivar reserva recurrente (${uuid})`);
  }

  create(data: any): Observable<any> {
    return apiPost<any>(this.http, this.apiUrl, data, 'crear reserva recurrente');
  }

  update(data: any): Observable<any> {
    return apiPut<any>(this.http, this.apiUrl, data, 'actualizar reserva recurrente');
  }

  delete(uuid: string): Observable<any> {
    return apiDelete<any>(this.http, `${this.apiUrl}/${uuid}`, `eliminar reserva recurrente (${uuid})`);
  }
}
