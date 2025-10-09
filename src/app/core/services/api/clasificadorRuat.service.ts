/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ClasificadorRuat } from '../../models/clasificadorRuat.model';


@Injectable({
  providedIn: 'root'
})

export class ClasificadorRuatService {
  apiUrl = environment.backendUrl + '/clasificadores';

  constructor(private http: HttpClient) { }

  getAll(): Observable<ClasificadorRuat[]> {
    return this.http.get<ClasificadorRuat[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<ClasificadorRuat>{
    return this.http.get<ClasificadorRuat>(`${this.apiUrl}/${uuid}`);
  }
  save(data: ClasificadorRuat): Observable<ClasificadorRuat> {    
    return this.http.post<ClasificadorRuat>(`${this.apiUrl}`, data);
  }

  update(data: ClasificadorRuat): Observable<ClasificadorRuat> {
    return this.http.put<ClasificadorRuat>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
