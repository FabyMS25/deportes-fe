import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Contribuyente } from '../../models/contribuyente.models';

@Injectable({
  providedIn: 'root'
})
export class ContribuyentesService {

    apiUrl = environment.backendUrl + '/contribuyente';


  constructor(private http: HttpClient) { }

  getAll(): Observable<Contribuyente[]> {
    return this.http.get<Contribuyente[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: String): Observable<Contribuyente> {
    return this.http.get<Contribuyente>(`${this.apiUrl}/${uuid}`)
  }

  save(data: Contribuyente): Observable<Contribuyente> {
    return this.http.post<Contribuyente>(`${this.apiUrl}`, data);
  }

  update(data: Contribuyente): Observable<Contribuyente> {
    return this.http.put<Contribuyente>(`${this.apiUrl}`, data);
  }
  delete(uuid: String) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
