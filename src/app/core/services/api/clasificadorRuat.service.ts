/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ClasificadorRuat } from '../../models/clasificadorRuat.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';


@Injectable({
  providedIn: 'root'
})

export class ClasificadorRuatService {
  apiUrl = environment.backendUrl + '/clasificadores';

  constructor(private http: HttpClient) { }

  getAll(): Observable<ClasificadorRuat[]> {
    return apiGet<ClasificadorRuat[]>(this.http, this.apiUrl, 'obtener clasificadores RUAT');
  }

  getByUuid(uuid:string):Observable<ClasificadorRuat>{
    return apiGet<ClasificadorRuat>(this.http, `${this.apiUrl}/${uuid}`, `obtener clasificador RUAT (${uuid})`);
  }
  save(data: ClasificadorRuat): Observable<ClasificadorRuat> {    
    return apiPost<ClasificadorRuat>(this.http, this.apiUrl, data, 'guardar clasificador RUAT');
  }

  update(data: ClasificadorRuat): Observable<ClasificadorRuat> {
    return apiPut<ClasificadorRuat>(this.http, this.apiUrl, data, 'actualizar clasificador RUAT');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `anular clasificador RUAT (${uuid})`);
  }
}
