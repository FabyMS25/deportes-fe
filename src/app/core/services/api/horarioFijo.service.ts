import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { HorarioFijo } from '../../models/horarioFijo.model';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.sessionStorage.getItem('auth-token')}` })
};

@Injectable({
  providedIn: 'root'
})
export class HorarioFijoService {
    apiUrl = environment.backendUrl + '/horarioFijo';


  constructor(private http: HttpClient) { }

  getAll(): Observable<HorarioFijo[]> {
    return this.http.get<HorarioFijo[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<HorarioFijo>{
    return this.http.get<HorarioFijo>(`${this.apiUrl}/${uuid}`);
  }

  save(data: any): Observable<HorarioFijo> {  
    return this.http.post<HorarioFijo>(`${this.apiUrl}`, data);
  }

  update(data: any): Observable<HorarioFijo> {
    return this.http.put<HorarioFijo>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
