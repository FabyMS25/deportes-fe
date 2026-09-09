/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

/**Models */
import { Superficie } from '../../models/superficie.model';

@Injectable({
  providedIn: 'root'
})

export class SuperficiesService {
  apiUrl = environment.backendUrl + '/superficie';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Superficie[]> {
    return apiGet<Superficie[]>(this.http, this.apiUrl, 'obtener superficies');
  }

  getByUuid(uuid:string):Observable<Superficie>{
    return apiGet<Superficie>(this.http, `${this.apiUrl}/${uuid}`, `obtener superficie (${uuid})`);
  }
  save(data: Superficie): Observable<Superficie> {
    return apiPost<Superficie>(this.http, this.apiUrl, data, 'guardar superficie');
  }

  update(data: Superficie): Observable<Superficie> {
    return apiPut<Superficie>(this.http, this.apiUrl, data, 'actualizar superficie');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `anular superficie (${uuid})`);
  }
}
