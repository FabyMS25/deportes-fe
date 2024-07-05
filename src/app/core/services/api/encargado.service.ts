import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Encargado } from '../../models/encargado';

@Injectable({
  providedIn: 'root'
})
export class EncargadoService {

    apiUrl = environment.backendUrl + '/encargado';


  constructor(private http: HttpClient) { }

  getAll(): Observable<Encargado[]> {
    return this.http.get<Encargado[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: String): Observable<Encargado> {
    return this.http.get<Encargado>(`${this.apiUrl}/${uuid}`)
  }

  save(data: Encargado): Observable<Encargado> {
    return this.http.post<Encargado>(`${this.apiUrl}`, data);
  }

  update(data: Encargado): Observable<Encargado> {
    return this.http.put<Encargado>(`${this.apiUrl}`, data);
  }
  delete(uuid: String) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
