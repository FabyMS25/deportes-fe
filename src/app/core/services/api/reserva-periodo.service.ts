import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaPeriodo } from '../../models/reservaPeriodo.model';
import { PageResponse, apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

export interface ReservaPeriodFilters {
  tab?: number;
  searchTerm?: string;
  estadoReserva?: string;
  estadoValidacion?: string;
  categoria?: string;
  escuelaFiltro?: string;
  periodoFiltro?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservaPeriodoService {
  private apiUrl = `${environment.backendUrl}/reservas-periodo`;

  constructor(private http: HttpClient) {}

  getAll(
    page: number = 0,
    size: number = 20,
    filters?: ReservaPeriodFilters
  ): Observable<PageResponse<ReservaPeriodo>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return apiGet<PageResponse<ReservaPeriodo>>(this.http, this.apiUrl, 'obtener reservas periodo', { params });
  }

  getAllWithoutPagination(): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/all`, 'obtener reservas periodo sin paginación');
  }

  getByUuid(uuid: string): Observable<ReservaPeriodo> {
    return apiGet<ReservaPeriodo>(this.http, `${this.apiUrl}/${uuid}`, `obtener reserva periodo (${uuid})`);
  }

  getByReservaUuid(reservaUuid: string): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/reserva/${reservaUuid}`, `obtener reservas periodo por reserva (${reservaUuid})`);
  }

  getByPeriodo(periodo: string): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/periodo/${periodo}`, `obtener reservas por periodo (${periodo})`);
  }

  getByContribuyente(contribuyenteUuid: string): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/contribuyente/${contribuyenteUuid}`, `obtener reservas periodo por contribuyente (${contribuyenteUuid})`);
  }

  getByOrganizacion(organizacionUuid: string): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/organizacion/${organizacionUuid}`, `obtener reservas periodo por organización (${organizacionUuid})`);
  }

  getByEstudiante(estudianteUuid: string): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/estudiante/${estudianteUuid}`, `obtener reservas periodo por estudiante (${estudianteUuid})`);
  }

  save(data: ReservaPeriodo): Observable<ReservaPeriodo> {
    return apiPost<ReservaPeriodo>(this.http, this.apiUrl, data, 'guardar reserva periodo');
  }

  update(data: ReservaPeriodo): Observable<ReservaPeriodo> {
    return apiPut<ReservaPeriodo>(this.http, this.apiUrl, data, 'actualizar reserva periodo');
  }

  delete(uuid: string): Observable<ReservaPeriodo> {
    return apiDelete<ReservaPeriodo>(this.http, `${this.apiUrl}/${uuid}`, `eliminar reserva periodo (${uuid})`);
  }
}
