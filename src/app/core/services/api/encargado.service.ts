import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class EncargadoService {

  apiUrl = environment.backendUrl + '/encargado';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return apiGet<any[]>(this.http, this.apiUrl, 'obtener encargados');
  }

  getByUuid(uuid: String): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/${uuid}`, `obtener encargado (${uuid})`)
  }
  
  getByUserUuid(uuid: String): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/user/${uuid}`, `obtener encargado por usuario (${uuid})`)
  }

  save(data: any): Observable<any> {
    return apiPost<any>(this.http, this.apiUrl, data, 'guardar encargado');
  }

  update(data: any): Observable<any> {
    return apiPut<any>(this.http, this.apiUrl, data, 'actualizar encargado');
  }
  delete(uuid: String): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `anular encargado (${uuid})`);
  }
}
