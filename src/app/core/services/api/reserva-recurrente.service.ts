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
  
  getAll(page: number = 0, size: number = 20): Observable<ReservaRecurrente[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<ReservaRecurrente[]>(`${this.apiUrl}`, { params });
  }

  getByUuid(uuid: string): Observable<ReservaRecurrente> {
    return this.http.get<ReservaRecurrente>(`${this.apiUrl}/${uuid}`);
  }

  getByReservaUuid(reservaUuid: string): Observable<ReservaRecurrente> {
    return this.http.get<ReservaRecurrente>(`${this.apiUrl}/reserva/${reservaUuid}`);
  }

  getByTipoRecurrencia(tipoRecurrencia: string): Observable<ReservaRecurrente[]> {
    return this.http.get<ReservaRecurrente[]>(`${this.apiUrl}/tipo/${tipoRecurrencia}`);
  }

  getActivas(): Observable<ReservaRecurrente[]> {
    return this.http.get<ReservaRecurrente[]>(`${this.apiUrl}/activas/vigentes`);
  }

  getActivasByCampo(uuidCampo: string): Observable<ReservaRecurrente[]> {
    return this.http.get<ReservaRecurrente[]>(`${this.apiUrl}/activas/campo/${uuidCampo}`);
  }

  getActivasEnFecha(fecha: Date): Observable<ReservaRecurrente[]> {
    return this.http.get<ReservaRecurrente[]>(`${this.apiUrl}/activas/fecha/${fecha.toISOString().split('T')[0]}`);
  }

  activar(uuid: string): Observable<ReservaRecurrente> {
    return this.http.put<ReservaRecurrente>(`${this.apiUrl}/${uuid}/activar`, null);
  }

  desactivar(uuid: string): Observable<ReservaRecurrente> {
    return this.http.put<ReservaRecurrente>(`${this.apiUrl}/${uuid}/desactivar`, null);
  }

  create(data: ReservaRecurrente): Observable<ReservaRecurrente> {
    return this.http.post<ReservaRecurrente>(`${this.apiUrl}`, data);
  }

  update(data: ReservaRecurrente): Observable<ReservaRecurrente> {
    return this.http.put<ReservaRecurrente>(`${this.apiUrl}`, data);
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}