/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { Superficie } from '../../models/superficie.model';

/**Models */

@Injectable({
  providedIn: 'root'
})

export class SuperficiesService {
  apiUrl = environment.backendUrl + '/superficie';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Superficie[]> {
    return this.http.get<Superficie[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<Superficie>{
    return this.http.get<Superficie>(`${this.apiUrl}/${uuid}`);
  }
  save(data: Superficie): Observable<Superficie> {    
    return this.http.post<Superficie>(`${this.apiUrl}`, data);
  }

  update(data: Superficie): Observable<Superficie> {
    return this.http.put<Superficie>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
