import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { EncargadoComplejo } from '../../models/encargadoComplejo';

@Injectable({
  providedIn: 'root'
})
export class EncargadoService {

    apiUrl = environment.backendUrl + '/encargado';


  constructor(private http: HttpClient) { }

  getAll(): Observable<EncargadoComplejo[]> {
    return this.http.get<EncargadoComplejo[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: String): Observable<EncargadoComplejo> {
    return this.http.get<EncargadoComplejo>(`${this.apiUrl}/${uuid}`)
  }
  
  getByUserUuid(uuid: String): Observable<EncargadoComplejo> {
    return this.http.get<EncargadoComplejo>(`${this.apiUrl}/user/${uuid}`)
  }

  save(data: EncargadoComplejo): Observable<EncargadoComplejo> {
    return this.http.post<EncargadoComplejo>(`${this.apiUrl}`, data);
  }

  update(data: EncargadoComplejo): Observable<EncargadoComplejo> {
    return this.http.put<EncargadoComplejo>(`${this.apiUrl}`, data);
  }
  delete(uuid: String) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
