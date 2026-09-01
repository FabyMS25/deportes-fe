import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { CampoDeportivo } from '../../models/campoDeportivo.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class SportsFieldsService {
    apiUrl = environment.backendUrl + '/sports-fields';


  constructor(private http: HttpClient) { }

  getAll(): Observable<CampoDeportivo[]> {
    return apiGet<CampoDeportivo[]>(this.http, this.apiUrl, 'obtener campos deportivos');
  }

  getByUuid(uuid:string): Observable<CampoDeportivo> {
    return apiGet<CampoDeportivo>(this.http, `${this.apiUrl}/${uuid}`, `obtener campo deportivo (${uuid})`);
  }

  getByFacility(data:any): Observable<CampoDeportivo[]> {
    return apiGet<CampoDeportivo[]>(this.http, `${this.apiUrl}/complejo/${data.uuid}`, `obtener campos por complejo (${data.uuid})`);
  }

  save(data: any): Observable<CampoDeportivo> {
    return apiPost<CampoDeportivo>(this.http, this.apiUrl, data, 'guardar campo deportivo');
  }

  update(data: any): Observable<CampoDeportivo> {
    return apiPut<CampoDeportivo>(this.http, this.apiUrl, data, 'actualizar campo deportivo');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `eliminar campo deportivo (${uuid})`);
  }
}
