import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Tablero } from '../../models/tablero.models';


@Injectable({
  providedIn: 'root'
})
export class TableroService {
  private apiUrl = environment.backendUrl + '/tablero';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Tablero[]> {
    return this.http.get<Tablero[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: string): Observable<Tablero> {
    return this.http.get<Tablero>(`${this.apiUrl}/${uuid}`);
  }

  save(data: any): Observable<any> {
    return this.http.post<Tablero>(`${this.apiUrl}`, data);
  }

  update(data: Tablero): Observable<Tablero> {
    return this.http.put<Tablero>(`${this.apiUrl}`, data);
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}