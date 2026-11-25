import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Reserva } from '../../models/reserva.model';
import { ReservaPeriodo } from '../../models/reservaPeriodo.model';
import { PageResponse, apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

export interface ReservaPeriodReservationFilters {
  revisarEstados?: boolean;
  tab?: number;
  searchTerm?: string;
  estadoReserva?: string;
  estadoValidacion?: string;
  organization?: string;
  periodoFiltro?: {
    mesFiltro?: number;
    anioFiltro?: number;
  };
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ReservaPeriodFilters {
  revisarEstados?: boolean;
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

  getReservationList(
    page: number = 0,
    size: number = 20,
    filters?: ReservaPeriodReservationFilters
  ): Observable<PageResponse<Reserva>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (key === 'periodoFiltro' && value && typeof value === 'object') {
        if (value.mesFiltro !== null && value.mesFiltro !== undefined) {
          params = params.set('mesFiltro', String(value.mesFiltro));
        }
        if (value.anioFiltro !== null && value.anioFiltro !== undefined) {
          params = params.set('anioFiltro', String(value.anioFiltro));
        }
      } else if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return apiGet<PageResponse<Reserva>>(
      this.http,
      `${this.apiUrl}/reservas`,
      'obtener listado de reservas por periodo',
      { params }
    );
  }

  getAllWithoutPagination(): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/all`, 'obtener reservas periodo sin paginación');
  }

  getByUuid(uuid: string): Observable<ReservaPeriodo> {
    return apiGet<ReservaPeriodo>(this.http, `${this.apiUrl}/${uuid}`, `obtener reserva periodo (${uuid})`);
  }

  getByReservationUuid(reservaUuid: string): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/reserva/${reservaUuid}`, `obtener reservas periodo por reserva (${reservaUuid})`);
  }

  getByPeriodo(periodo: string): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/periodo/${periodo}`, `obtener reservas por periodo (${periodo})`);
  }

  getByTaxpayer(contribuyenteUuid: string): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/contribuyente/${contribuyenteUuid}`, `obtener reservas periodo por contribuyente (${contribuyenteUuid})`);
  }

  getByOrganization(organizacionUuid: string): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/organizacion/${organizacionUuid}`, `obtener reservas periodo por organización (${organizacionUuid})`);
  }

  getStudentHistory(estudianteUuid: string): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, this.apiUrl + '/estudiante/' + estudianteUuid + '/historial', 'obtener historial de mensualidades');
  }

  getByStudent(estudianteUuid: string): Observable<ReservaPeriodo[]> {
    return apiGet<ReservaPeriodo[]>(this.http, `${this.apiUrl}/estudiante/${estudianteUuid}`, `obtener reservas periodo por estudiante (${estudianteUuid})`);
  }

  save(data: ReservaPeriodo): Observable<ReservaPeriodo> {
    return apiPost<ReservaPeriodo>(this.http, this.apiUrl, data, 'guardar reserva periodo');
  }

  update(data: ReservaPeriodo): Observable<ReservaPeriodo> {
    return apiPut<ReservaPeriodo>(this.http, this.apiUrl, data, 'actualizar reserva periodo');
  }

  delete(uuid: string): Observable<ReservaPeriodo> {
    return apiDelete<ReservaPeriodo>(this.http, `${this.apiUrl}/${uuid}`, `anular reserva periodo (${uuid})`);
  }
}
