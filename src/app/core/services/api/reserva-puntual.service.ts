import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaPuntual } from '../../models/reservaPuntual.models';

@Injectable({
  providedIn: 'root'
})
export class ReservaPuntualService {
  apiUrl = environment.backendUrl + '/reservas-puntuales';

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

  getByFechaUso(fechaUso: Date): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/fecha-uso/${fechaUso.toISOString().split('T')[0]}`);
  }

  getByCampoYFecha(uuidCampo: string, fechaUso: Date): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/campo/${uuidCampo}/fecha/${fechaUso.toISOString().split('T')[0]}`);
  }

  getActivasByCampoYFecha(uuidCampo: string, fechaUso: Date): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/activas/campo/${uuidCampo}/fecha/${fechaUso.toISOString().split('T')[0]}`);
  }

  verificarConflictos(uuidCampo: string, fechaUso: Date, horaInicio: string, horaFin: string, excludeReservaUuid?: string): Observable<boolean> {
    let params = new HttpParams()
      .set('campoUuid', uuidCampo)
      .set('fechaUso', fechaUso.toISOString().split('T')[0])
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