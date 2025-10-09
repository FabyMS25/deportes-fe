import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { CampoDeportivo } from '../../models/campoDeportivo.model';

/**Models */


const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.sessionStorage.getItem('auth-token')}` })
};

@Injectable({
  providedIn: 'root'
})
export class CamposDeportivoService {
    apiUrl = environment.backendUrl + '/campoDeportivo';


  constructor(private http: HttpClient) { }

  getAll(): Observable<CampoDeportivo[]> {
    return this.http.get<CampoDeportivo[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<CampoDeportivo>{
    return this.http.get<CampoDeportivo>(`${this.apiUrl}/${uuid}`);
  }

  getByComplejo(data:any):Observable<CampoDeportivo>{
    return this.http.get<CampoDeportivo>(`${this.apiUrl}/complejo/${data.uuid}`);
  }

  save(data: CampoDeportivo): Observable<CampoDeportivo> {
    // var headerToken = {'Authorization': `Bearer `+ window.sessionStorage.getItem('auth-token')};
    return this.http.post<CampoDeportivo>(`${this.apiUrl}`, data);
  }

  update(data: CampoDeportivo): Observable<CampoDeportivo> {
    return this.http.put<CampoDeportivo>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
