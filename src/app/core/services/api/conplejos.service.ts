import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**Enviroments */
import { environment } from 'src/environments/environment';

/**Models */
import { Complejo } from '../../models/complejo.model';


const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.sessionStorage.getItem('auth-token')}` })
};

@Injectable({
  providedIn: 'root'
})
export class ComplejosService {
    apiUrl = environment.backendUrl + '/canchas';


  constructor(private http: HttpClient) { }

  getAll(): Observable<Complejo[]> {
    return this.http.get<Complejo[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<Complejo>{
    return this.http.get<Complejo>(`${this.apiUrl}/${uuid}`);
  }

  save(data: Complejo): Observable<Complejo> {  
    // var headerToken = {'Authorization': `Bearer `+ window.sessionStorage.getItem('auth-token')};
    return this.http.post<Complejo>(`${this.apiUrl}`, data);
  }

  update(data: Complejo): Observable<Complejo> {
    return this.http.put<Complejo>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
