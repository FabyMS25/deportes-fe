import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { HorarioExcepcion } from '../../models/horarioExcepcion.model';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.sessionStorage.getItem('auth-token')}` })
};

@Injectable({
  providedIn: 'root'
})
export class HorarioExcepcionService {
    apiUrl = environment.backendUrl + '/horarioExcepcion';


  constructor(private http: HttpClient) { }

  getAll(): Observable<HorarioExcepcion[]> {
    return this.http.get<HorarioExcepcion[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<HorarioExcepcion>{
    return this.http.get<HorarioExcepcion>(`${this.apiUrl}/${uuid}`);
  }

  save(data: any): Observable<HorarioExcepcion> {  
    return this.http.post<HorarioExcepcion>(`${this.apiUrl}`, data);
  }

  update(data: any): Observable<HorarioExcepcion> {
    return this.http.put<HorarioExcepcion>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
