import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaTarifaDetalle } from '../../models/reservaTarifaDetalle.model';

@Injectable({
  providedIn: 'root'
})
export class ReservaTarifaDetalleService {
  apiUrl = environment.backendUrl + '/reservatarifadetalles';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}`);
  }

  getByUuid(uuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${uuid}`);
  }

  getByReservaUuid(reservaUuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reserva/${reservaUuid}`);
  }

  create(data: ReservaTarifaDetalle): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  update(data: ReservaTarifaDetalle): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}`, data);
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${uuid}`);
  }
}
