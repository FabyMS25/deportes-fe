import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

import { Pago } from '../../models/pago.model';
import { apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})

export class PagoService {
  apiUrl = environment.backendUrl + '/pagos';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return apiGet<any[]>(this.http, this.apiUrl, 'obtener pagos');
  }

  getByUuid(uuid: String): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/${uuid}`, `obtener pago (${uuid})`);
  }

  save(data: any): Observable<any> {
    return apiPost<any>(this.http, this.apiUrl, data, 'guardar pago');
  }

  update(data: any): Observable<any> {
    return apiPut<any>(this.http, this.apiUrl, data, 'actualizar pago');
  }

}
