import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { HorarioExcepcion } from '../../models/horarioExcepcion.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class HorarioExcepcionService {
    apiUrl = environment.backendUrl + '/horarioExcepcion';


  constructor(private http: HttpClient) { }

  getAll(): Observable<HorarioExcepcion[]> {
    return apiGet<HorarioExcepcion[]>(this.http, this.apiUrl, 'obtener excepciones de horario');
  }

  getByUuid(uuid:string):Observable<HorarioExcepcion>{
    return apiGet<HorarioExcepcion>(this.http, `${this.apiUrl}/${uuid}`, `obtener excepción de horario (${uuid})`);
  }

  save(data: any): Observable<HorarioExcepcion> {  
    return apiPost<HorarioExcepcion>(this.http, this.apiUrl, data, 'guardar excepción de horario');
  }

  update(data: any): Observable<HorarioExcepcion> {
    return apiPut<HorarioExcepcion>(this.http, this.apiUrl, data, 'actualizar excepción de horario');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `anular excepción de horario (${uuid})`);
  }
}
