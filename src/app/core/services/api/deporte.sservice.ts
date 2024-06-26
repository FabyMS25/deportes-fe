/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';

/**Models */
import { Deporte } from '../../models/deporte.model';

@Injectable({
  providedIn: 'root'
})

export class DeportesService {
  apiUrl = environment.backendUrl + '/deportes';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Deporte[]> {
    return this.http.get<Deporte[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<Deporte>{
    return this.http.get<Deporte>(`${this.apiUrl}/${uuid}`);
  }
  save(data: Deporte): Observable<Deporte> {    
    return this.http.post<Deporte>(`${this.apiUrl}`, data);
  }

  update(data: Deporte): Observable<Deporte> {
    return this.http.put<Deporte>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
