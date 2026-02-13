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

  getAll(): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}/${uuid}`);
  }

  getByComplejo(data:any):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}/complejo/${data.uuid}`);
  }

  save(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  update(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
