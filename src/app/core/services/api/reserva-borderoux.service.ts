import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ClasificadorRuat } from '../../models/clasificadorRuat.model';
import { ReservaBorderoux } from '../../models/reservaBorderoux.model';
import { PageResponse, apiGet, apiPost } from '../apiResponses';

export interface ReservaBorderouxFilters {
  tab?: number;
  searchTerm?: string;
  estadoReserva?: string;
  organization?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class ReservaBorderouxService {
  private readonly apiUrl = `${environment.backendUrl}/reservas-borderoux`;

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 20, filters?: ReservaBorderouxFilters): Observable<PageResponse<ReservaBorderoux>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return apiGet<PageResponse<ReservaBorderoux>>(this.http, this.apiUrl, 'obtener liquidaciones Borderoux', { params });
  }

  getByUuid(uuid: string): Observable<ReservaBorderoux> {
    return apiGet<ReservaBorderoux>(this.http, `${this.apiUrl}/${uuid}`, `obtener liquidación Borderoux (${uuid})`);
  }

  create(data: ReservaBorderoux): Observable<ReservaBorderoux> {
    return apiPost<ReservaBorderoux>(this.http, this.apiUrl, data, 'registrar liquidación Borderoux');
  }

  getClasificador(): Observable<ClasificadorRuat> {
    return apiGet<ClasificadorRuat>(this.http, `${this.apiUrl}/clasificador`, 'obtener clasificador RUAT Borderoux');
  }
}
