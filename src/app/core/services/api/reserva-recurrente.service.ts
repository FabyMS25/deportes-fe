import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaRecurrente } from '../../models/reservaRecurrente.model';

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
    return this.http.get<any>(`${this.apiUrl}`, { params });
  }

  checkExpiredReservations(): Observable<any> {
    return this.http.post(`${this.apiUrl}/verificar-expiradas`, null);
  }
  
  getByUuid(uuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${uuid}`);
  }

  getByReservaUuid(reservaUuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reserva/${reservaUuid}`);
  }

  getByTipoRecurrencia(tipoRecurrencia: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tipo/${tipoRecurrencia}`);
  }

  getActivas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/activas/vigentes`);
  }

  getActivasByCampo(uuidCampo: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/activas/campo/${uuidCampo}`);
  }

  getActivasEnFecha(fecha: Date): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/activas/fecha/${this.formatDateLocal(fecha)}`);
  }

  private formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  activar(uuid: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${uuid}/activar`, null);
  }

  desactivar(uuid: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${uuid}/desactivar`, null);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  update(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}`, data);
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
