import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**Enviroments */
import { environment } from 'src/environments/environment';

/**Models */
import { Horario } from '../../models/horario.model';


const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.sessionStorage.getItem('auth-token')}` })
};

@Injectable({
  providedIn: 'root'
})
export class CanchaHorariosService {
    apiUrl = environment.backendUrl + '/horario';


  constructor(private http: HttpClient) { }

  getAll(): Observable<Horario[]> {
    return this.http.get<Horario[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<Horario>{
    return this.http.get<Horario>(`${this.apiUrl}/${uuid}`);
  }

  save(data: Horario): Observable<Horario> {  
    return this.http.post<Horario>(`${this.apiUrl}`, data);
  }

  update(data: Horario): Observable<Horario> {
    return this.http.put<Horario>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
