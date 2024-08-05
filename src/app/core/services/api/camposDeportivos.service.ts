import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { campoDeportivo } from '../../models/campoDeportivo.model';

/**Models */


const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.sessionStorage.getItem('auth-token')}` })
};

@Injectable({
  providedIn: 'root'
})
export class CamposDeportivoService {
    apiUrl = environment.backendUrl + '/canchas';


  constructor(private http: HttpClient) { }

  getAll(): Observable<campoDeportivo[]> {
    return this.http.get<campoDeportivo[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<campoDeportivo>{
    return this.http.get<campoDeportivo>(`${this.apiUrl}/${uuid}`);
  }

  getByComplejo(uuid:string):Observable<campoDeportivo>{
    return this.http.get<campoDeportivo>(`${this.apiUrl}/complejo/${uuid}`);
  }

  save(data: campoDeportivo): Observable<campoDeportivo> {  
    // var headerToken = {'Authorization': `Bearer `+ window.sessionStorage.getItem('auth-token')};
    return this.http.post<campoDeportivo>(`${this.apiUrl}`, data);
  }

  update(data: campoDeportivo): Observable<campoDeportivo> {
    return this.http.put<campoDeportivo>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
