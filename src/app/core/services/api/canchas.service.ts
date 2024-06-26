import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**Enviroments */
import { environment } from 'src/environments/environment';

/**Models */
import { Cancha } from '../../models/cancha.model';


const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.sessionStorage.getItem('auth-token')}` })
};

@Injectable({
  providedIn: 'root'
})
export class CanchaService {
    apiUrl = environment.backendUrl + '/canchas';


  constructor(private http: HttpClient) { }

  getAll(): Observable<Cancha[]> {
    return this.http.get<Cancha[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<Cancha>{
    return this.http.get<Cancha>(`${this.apiUrl}/${uuid}`);
  }

  save(data: Cancha): Observable<Cancha> {  
    // var headerToken = {'Authorization': `Bearer `+ window.sessionStorage.getItem('auth-token')};
    return this.http.post<Cancha>(`${this.apiUrl}`, data);
  }

  update(data: Cancha): Observable<Cancha> {
    return this.http.put<Cancha>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
