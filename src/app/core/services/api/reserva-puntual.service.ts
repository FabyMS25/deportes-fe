import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaPuntual } from '../../models/reservaPuntual.model';

export interface ReservaPuntualFilters {
  tab?: number;
  searchTerm?: string;
  estadoReserva?: string;
  estadoValidacion?: string;
  categoria?: string;
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
    return this.http.get<any>(`${this.apiUrl}`, { params });
  }
  
  checkExpiredReservations(): Observable<any> {
    return this.http.post(`${this.apiUrl}/verificar-expiradas`, null);
  }
  
  validarCambioHorario(
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

    return this.http.get<any>(`${this.apiUrl}/conflictos`, { params });
  }

  private formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  getByUuid(uuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${uuid}`);
  }

  getByReservaUuid(reservaUuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reserva/${reservaUuid}`);
  }

  getByFechaUso(fechaUso: Date): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/fecha-uso/${this.formatDateLocal(fechaUso)}`);
  }

  getByCampoYFecha(uuidCampo: string, fechaUso: Date): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/campo/${uuidCampo}/fecha/${this.formatDateLocal(fechaUso)}`);
  }

  getActivasByCampoYFecha(uuidCampo: string, fechaUso: Date): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/activas/campo/${uuidCampo}/fecha/${this.formatDateLocal(fechaUso)}`);
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
    
    return this.http.get<boolean>(`${this.apiUrl}/conflictos`, { params });
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  update(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}`, data);
  }

  registrarUsoReal(uuid: string, fechaUsoReal: Date): Observable<any> {
    let params = new HttpParams().set('fechaUsoReal', fechaUsoReal.toISOString());
    return this.http.put<any>(`${this.apiUrl}/${uuid}/registrar-uso`, null, { params });
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
