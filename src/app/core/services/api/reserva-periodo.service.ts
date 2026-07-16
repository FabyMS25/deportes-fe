import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaPeriodo } from '../../models/reservaPeriodo.model';
import { ApiResponse, PageResponse } from '../apiResponses';

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
  ): Observable<ApiResponse<PageResponse<ReservaPeriodo>>> {
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
    return this.http.get<ApiResponse<PageResponse<ReservaPeriodo>>>(this.apiUrl, { params });
  }

  getAllWithoutPagination(): Observable<ApiResponse<ReservaPeriodo[]>> {
    return this.http.get<ApiResponse<ReservaPeriodo[]>>(`${this.apiUrl}/all`);
  }

  getByUuid(uuid: string): Observable<ApiResponse<ReservaPeriodo>> {
    return this.http.get<ApiResponse<ReservaPeriodo>>(`${this.apiUrl}/${uuid}`);
  }

  getByReservaUuid(reservaUuid: string): Observable<ApiResponse<ReservaPeriodo[]>> {
    return this.http.get<ApiResponse<ReservaPeriodo[]>>(`${this.apiUrl}/reserva/${reservaUuid}`);
  }

  getByPeriodo(periodo: string): Observable<ApiResponse<ReservaPeriodo[]>> {
    return this.http.get<ApiResponse<ReservaPeriodo[]>>(`${this.apiUrl}/periodo/${periodo}`);
  }

  getByContribuyente(contribuyenteUuid: string): Observable<ApiResponse<ReservaPeriodo[]>> {
    return this.http.get<ApiResponse<ReservaPeriodo[]>>(`${this.apiUrl}/contribuyente/${contribuyenteUuid}`);
  }

  getByOrganizacion(organizacionUuid: string): Observable<ApiResponse<ReservaPeriodo[]>> {
    return this.http.get<ApiResponse<ReservaPeriodo[]>>(`${this.apiUrl}/organizacion/${organizacionUuid}`);
  }

  getByEstudiante(estudianteUuid: string): Observable<ApiResponse<ReservaPeriodo[]>> {
    return this.http.get<ApiResponse<ReservaPeriodo[]>>(`${this.apiUrl}/estudiante/${estudianteUuid}`);
  }

  save(data: ReservaPeriodo): Observable<ApiResponse<ReservaPeriodo>> {
    return this.http.post<ApiResponse<ReservaPeriodo>>(this.apiUrl, data);
  }

  update(data: ReservaPeriodo): Observable<ApiResponse<ReservaPeriodo>> {
    return this.http.put<ApiResponse<ReservaPeriodo>>(this.apiUrl, data);
  }

  delete(uuid: string): Observable<ApiResponse<ReservaPeriodo>> {
    return this.http.delete<ApiResponse<ReservaPeriodo>>(`${this.apiUrl}/${uuid}`);
  }
}
