/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { TarifaCategoria } from '../../models/tarifa-categoria.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

/**Models */

@Injectable({
  providedIn: 'root'
})

export class TarifaCategoriesService {
  apiUrl = environment.backendUrl + '/tarifacategoria';

  constructor(private http: HttpClient) { }

  getAll(): Observable<TarifaCategoria[]> {
    return apiGet<TarifaCategoria[]>(this.http, this.apiUrl, 'obtener categorías de tarifa');
  }

  getByUuid(uuid:string):Observable<TarifaCategoria>{
    return apiGet<TarifaCategoria>(this.http, `${this.apiUrl}/${uuid}`, `obtener categoría de tarifa (${uuid})`);
  }
  save(data: TarifaCategoria): Observable<TarifaCategoria> {    
    return apiPost<TarifaCategoria>(this.http, this.apiUrl, data, 'guardar categoría de tarifa');
  }

  update(data: TarifaCategoria): Observable<TarifaCategoria> {
    return apiPut<TarifaCategoria>(this.http, this.apiUrl, data, 'actualizar categoría de tarifa');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `anular categoría de tarifa (${uuid})`);
  }
}
