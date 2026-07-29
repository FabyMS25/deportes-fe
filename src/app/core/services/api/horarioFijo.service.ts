import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { HorarioFijo } from '../../models/horarioFijo.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class HorarioFijoService {
  apiUrl = environment.backendUrl + '/horarioFijo';

  constructor(private http: HttpClient) { }

  getAll(): Observable<HorarioFijo[]> {
    return apiGet<HorarioFijo[]>(this.http, this.apiUrl, 'obtener horarios fijos');
  }

  getByUuid(uuid:string):Observable<HorarioFijo>{
    return apiGet<HorarioFijo>(this.http, `${this.apiUrl}/${uuid}`, `obtener horario fijo (${uuid})`);
  }

  save(data: any): Observable<HorarioFijo> {  
    return apiPost<HorarioFijo>(this.http, this.apiUrl, data, 'guardar horario fijo');
  }

  update(data: any): Observable<HorarioFijo> {
    return apiPut<HorarioFijo>(this.http, this.apiUrl, data, 'actualizar horario fijo');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `eliminar horario fijo (${uuid})`);
  }
}
