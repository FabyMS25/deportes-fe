/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { Categoria } from '../../models/categoria.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

/**Models */

@Injectable({
  providedIn: 'root'
})

export class CategoriasService {
  apiUrl = environment.backendUrl + '/categorias';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Categoria[]> {
    return apiGet<Categoria[]>(this.http, this.apiUrl, 'obtener categorías');
  }

  getByUuid(uuid:string):Observable<Categoria>{
    return apiGet<Categoria>(this.http, `${this.apiUrl}/${uuid}`, `obtener categoría (${uuid})`);
  }
  save(data: Categoria): Observable<Categoria> {    
    return apiPost<Categoria>(this.http, this.apiUrl, data, 'guardar categoría');
  }

  update(data: Categoria): Observable<Categoria> {
    return apiPut<Categoria>(this.http, this.apiUrl, data, 'actualizar categoría');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `eliminar categoría (${uuid})`);
  }
}
