import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaRecurrente } from '../../models/reservaRecurrente.models';

@Injectable({
  providedIn: 'root'
})
export class ReservaRecurrenteService {
  apiUrl = environment.backendUrl + '/reservas-recurrentes';

  constructor(private http: HttpClient) { }
  
  getAll(page: number = 0, size: number = 20): Observable<any[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<any[]>(`${this.apiUrl}`, { params });
  }

  checkExpiredReservations(horasTimeout: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/verificar-expiradas`, null, {
      params: new HttpParams().set('horasTimeout', horasTimeout.toString())
    });
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
    return this.http.get<any[]>(`${this.apiUrl}/activas/fecha/${fecha.toISOString().split('T')[0]}`);
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