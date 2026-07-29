import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Tablero } from '../../models/tablero.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';


@Injectable({
  providedIn: 'root'
})
export class TableroService {
  private apiUrl = environment.backendUrl + '/tablero';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Tablero[]> {
    return apiGet<Tablero[]>(this.http, this.apiUrl, 'obtener tableros');
  }

  getByUuid(uuid: string): Observable<Tablero> {
    return apiGet<Tablero>(this.http, `${this.apiUrl}/${uuid}`, `obtener tablero (${uuid})`);
  }

  save(data: any): Observable<Tablero> {
    return apiPost<Tablero>(this.http, this.apiUrl, data, 'guardar tablero');
  }

  update(data: Tablero): Observable<Tablero> {
    return apiPut<Tablero>(this.http, this.apiUrl, data, 'actualizar tablero');
  }

  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `eliminar tablero (${uuid})`);
  }
}
