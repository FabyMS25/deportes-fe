import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaTarifaDetalle } from '../../models/reservaTarifaDetalle.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class ReservaTarifaDetalleService {
  apiUrl = environment.backendUrl + '/reservation-tariff-details';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any> {
    return apiGet<any>(this.http, this.apiUrl, 'obtener detalles de tarifa de reserva');
  }

  getByUuid(uuid: string): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/${uuid}`, `obtener detalle de tarifa (${uuid})`);
  }

  getByReservationUuid(reservaUuid: string): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/reserva/${reservaUuid}`, `obtener detalles de tarifa por reserva (${reservaUuid})`);
  }

  create(data: ReservaTarifaDetalle): Observable<any> {
    return apiPost<any>(this.http, this.apiUrl, data, 'crear detalle de tarifa');
  }

  update(data: ReservaTarifaDetalle): Observable<any> {
    return apiPut<any>(this.http, this.apiUrl, data, 'actualizar detalle de tarifa');
  }

  delete(uuid: string): Observable<any> {
    return apiDelete<any>(this.http, `${this.apiUrl}/${uuid}`, `anular detalle de tarifa (${uuid})`);
  }
}
