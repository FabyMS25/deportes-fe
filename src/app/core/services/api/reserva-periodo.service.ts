import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

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
  ): Observable<any> {
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

    return this.http.get<any>(this.apiUrl, { params });
  }

  getAllWithoutPagination(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/all`);
  }

  getByUuid(uuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${uuid}`);
  }

  getByReservaUuid(reservaUuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reserva/${reservaUuid}`);
  }

  getByPeriodo(periodo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/periodo/${periodo}`);
  }

  getByContribuyente(contribuyenteUuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/contribuyente/${contribuyenteUuid}`);
  }

  getByOrganizacion(organizacionUuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/organizacion/${organizacionUuid}`);
  }
  getByEstudiante(estudianteUuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estudiante/${estudianteUuid}`);
  }

  save(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  update(data: any): Observable<any> {
    return this.http.put<any>(this.apiUrl, data);
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${uuid}`);
  }
}