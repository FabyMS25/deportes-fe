import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**Enviroments */
import { environment } from 'src/environments/environment';

/**Models */
import { ComplejoDeportivo } from '../../models/complejoDeportivo.model';


const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.sessionStorage.getItem('auth-token')}` })
};

@Injectable({
  providedIn: 'root'
})
export class ComplejosService {
    apiUrl = environment.backendUrl + '/complejos';


  constructor(private http: HttpClient) { }

  getAll(): Observable<ComplejoDeportivo[]> {
    return this.http.get<ComplejoDeportivo[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<ComplejoDeportivo>{
    return this.http.get<ComplejoDeportivo>(`${this.apiUrl}/${uuid}`);
  }

  save(data: ComplejoDeportivo): Observable<ComplejoDeportivo> {  
    // var headerToken = {'Authorization': `Bearer `+ window.sessionStorage.getItem('auth-token')};
    return this.http.post<ComplejoDeportivo>(`${this.apiUrl}`, data);
  }

  update(data: ComplejoDeportivo): Observable<ComplejoDeportivo> {
    return this.http.put<ComplejoDeportivo>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
