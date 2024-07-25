import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**Enviroments */
import { environment } from 'src/environments/environment';

/**Models */
import { Tarifa } from '../../models/tarifa.model';


@Injectable({
  providedIn: 'root'
})
export class TarifaService {
  apiUrl = environment.backendUrl + '/tarifas';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Tarifa[]> {
    return this.http.get<Tarifa[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<Tarifa>{
    return this.http.get<Tarifa>(`${this.apiUrl}/${uuid}`);
  }

  save(data: any): Observable<Tarifa> {  
    return this.http.post<Tarifa>(`${this.apiUrl}`, data);
  }

  update(data: any): Observable<Tarifa> {
    return this.http.put<Tarifa>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
