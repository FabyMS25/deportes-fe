import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**Enviroments */
import { environment } from 'src/environments/environment';

/**Models */
import { Tarifa } from '../../models/tarifa.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';


@Injectable({
  providedIn: 'root'
})
export class TarifaService {
  apiUrl = environment.backendUrl + '/tarifas';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Tarifa[]> {
    return apiGet<Tarifa[]>(this.http, this.apiUrl, 'obtener tarifas');
  }

  getByUuid(uuid:string):Observable<Tarifa>{
    return apiGet<Tarifa>(this.http, `${this.apiUrl}/${uuid}`, `obtener tarifa (${uuid})`);
  }

  save(data: any): Observable<Tarifa> {  
    return apiPost<Tarifa>(this.http, this.apiUrl, data, 'guardar tarifa');
  }

  update(data: any): Observable<Tarifa> {
    return apiPut<Tarifa>(this.http, this.apiUrl, data, 'actualizar tarifa');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `eliminar tarifa (${uuid})`);
  }
}
