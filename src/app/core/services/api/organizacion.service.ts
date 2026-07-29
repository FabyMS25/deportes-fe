import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Organizacion } from '../../models/organizacion.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class OrganizacionService {

    apiUrl = environment.backendUrl + '/organizaciones';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return apiGet<any[]>(this.http, this.apiUrl, 'obtener organizaciones');
  }

  getByUuid(uuid: String): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/${uuid}`, `obtener organización (${uuid})`)
  }

  save(data: any): Observable<any> {
    return apiPost<any>(this.http, this.apiUrl, data, 'guardar organización');
  }

  update(data: any): Observable<any> {
    return apiPut<any>(this.http, this.apiUrl, data, 'actualizar organización');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `eliminar organización (${uuid})`);
  }
  
  getByRepresentante(contribuyenteUuid: string): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/representante/${contribuyenteUuid}`, `obtener organización por representante (${contribuyenteUuid})`);
  }

  getByContribuyente(contribuyenteUuid: string): Observable<any> {
    return apiGet<any>(this.http, `${this.apiUrl}/contribuyente/${contribuyenteUuid}`, `obtener organizaciones por contribuyente (${contribuyenteUuid})`);
  }
}


