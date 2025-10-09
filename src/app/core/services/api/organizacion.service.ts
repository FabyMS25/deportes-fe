import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { Organizacion } from '../../models/organizacion.models';

@Injectable({
  providedIn: 'root'
})
export class OrganizacionService {

    apiUrl = environment.backendUrl + '/organizaciones';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Organizacion[]> {
    return this.http.get<Organizacion[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: String): Observable<Organizacion> {
    return this.http.get<Organizacion>(`${this.apiUrl}/${uuid}`)
  }

  save(data: Organizacion): Observable<Organizacion> {
    return this.http.post<Organizacion>(`${this.apiUrl}`, data);
  }

  update(data: Organizacion): Observable<Organizacion> {
    return this.http.put<Organizacion>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}


