import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EncargadoService {

    apiUrl = environment.backendUrl + '/encargado';


  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: String): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${uuid}`)
  }
  
  getByUserUuid(uuid: String): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/user/${uuid}`)
  }

  save(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  update(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}`, data);
  }
  delete(uuid: String) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
