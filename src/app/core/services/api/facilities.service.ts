import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**Enviroments */
import { environment } from 'src/environments/environment';

/**Models */
import { ComplejoDeportivo } from '../../models/complejoDeportivo.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';


@Injectable({
  providedIn: 'root'
})
export class FacilitiesService {
    apiUrl = environment.backendUrl + '/complejos';


  constructor(private http: HttpClient) { }

  getAll(): Observable<ComplejoDeportivo[]> {
    return apiGet<ComplejoDeportivo[]>(this.http, this.apiUrl, 'obtener complejos');
  }

  getByUuid(uuid:string):Observable<ComplejoDeportivo>{
    return apiGet<ComplejoDeportivo>(this.http, `${this.apiUrl}/${uuid}`, `obtener complejo (${uuid})`);
  }

  save(data: ComplejoDeportivo): Observable<ComplejoDeportivo> {  
    return apiPost<ComplejoDeportivo>(this.http, this.apiUrl, data, 'guardar complejo');
  }

  update(data: ComplejoDeportivo): Observable<ComplejoDeportivo> {
    return apiPut<ComplejoDeportivo>(this.http, this.apiUrl, data, 'actualizar complejo');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `anular complejo (${uuid})`);
  }
}
