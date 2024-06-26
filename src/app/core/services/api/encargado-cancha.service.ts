import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { EncargadoCancha } from '../../models/encargado-cancha';

@Injectable({
  providedIn: 'root'
})
export class EncargadoCanchaService {

    apiUrl = environment.backendUrl + '/encargado';


  constructor(private http: HttpClient) { }

  getAll(): Observable<EncargadoCancha[]> {
    return this.http.get<EncargadoCancha[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: String): Observable<EncargadoCancha> {
    return this.http.get<EncargadoCancha>(`${this.apiUrl}/${uuid}`)
  }

  save(data: EncargadoCancha): Observable<EncargadoCancha> {
    return this.http.post<EncargadoCancha>(`${this.apiUrl}`, data);
  }

  update(data: EncargadoCancha): Observable<EncargadoCancha> {
    return this.http.put<EncargadoCancha>(`${this.apiUrl}`, data);
  }
  delete(uuid: String) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
