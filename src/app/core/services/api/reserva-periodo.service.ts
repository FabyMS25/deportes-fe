import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ReservaPeriodFilters {
  tab?: number;
  searchTerm?: string;
  estadoReserva?: string;
  categoria?: string;
  escuelaFiltro?:string,
  periodoFiltro?:string,
}

@Injectable({
  providedIn: 'root'
})
export class ReservaPeriodoService {
  apiUrl = environment.backendUrl + '/reservas-periodo';

  constructor(private http: HttpClient) { }

  getAll(
    page: number = 0,
    size: number = 20,
    filters?: ReservaPeriodFilters
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
    return this.http.get<any>(`${this.apiUrl}`, { params });
  }

  getByUuid(uuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${uuid}`);
  }

  getByMatricula(matricula: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/matricula/${matricula}`);
  }

  save(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  update(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}`, data);
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }

  getByContribuyente(contribuyenteUuid: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/contribuyente/${contribuyenteUuid}`);
  }

  getByEscuela(codigoEscuela: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/escuela/${codigoEscuela}`);
  }

  getActivos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/activos`);
  }

  getInactivos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/inactivos`);
  }

  inactivarEstudiante(uuid: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${uuid}/inactivar`, {});
  }

  activarEstudiante(uuid: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${uuid}/activar`, {});
  }

  generarMatricula(codigoEscuela: string): Observable<{ matricula: string }> {
    return this.http.get<{ matricula: string }>(`${this.apiUrl}/generar-matricula/${codigoEscuela}`);
  }

  getMensualidadesByEstudiante(estudianteUuid: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${estudianteUuid}/mensualidades`);
  }

  getMensualidadesPendientes(estudianteUuid: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${estudianteUuid}/mensualidades-pendientes`);
  }
}