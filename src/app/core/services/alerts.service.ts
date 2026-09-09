import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { apiDelete, apiGet, apiPost, apiPut } from './apiResponses';
import { environment } from 'src/environments/environment';
import { Alert } from '../models/alert.models';

const url = environment.backendUrl + '/alerta';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(private http: HttpClient) { }

  getAll(): Observable<Alert[]> {
    return apiGet<Alert[]>(this.http, url, 'obtener todas las Alertas');
  }

  getByUuid(uuid: string): Observable<Alert> {
    return apiGet<Alert>(this.http, `${url}/uuid/${uuid}`, `obtener Alerta por UUID (${uuid})`);
  }

  create(alertaDto: Alert): Observable<Alert> {
    return apiPost<Alert>(this.http, url, alertaDto, 'crear Alerta');
  }

  update(alertaDto: Alert): Observable<Alert> {
    return apiPut<Alert>(this.http, url, alertaDto, 'actualizar Alerta');
  }

  delete(uuid: string): Observable<any> {
    return apiDelete<any>(this.http, `${url}/${uuid}`, `anular Alerta por UUID (${uuid})`);
  }

  getByFechaActual(fechaActual: Date): Observable<Alert[]> {
    const params = new HttpParams().set('fechaActual', fechaActual.toISOString());
    return apiGet<Alert[]>(this.http, `${url}/fecha-actual`, `obtener Alertas por fecha actual ${fechaActual}`, { params });
  }

  getByFechaActualAndUuidDestinatario(fechaActual: Date, uuidDestinatario: string): Observable<Alert[]> {
    const params = new HttpParams()
      .set('fechaActual', fechaActual.toISOString())
      .set('uuidDestinatario', uuidDestinatario);
      
    return apiGet<Alert[]>(this.http, `${url}/fecha-destinatario`, `obtener Alertas por fecha actual ${fechaActual} y destinatario ${uuidDestinatario}`, { params });
  }
}
