/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';

/**Models */
import { CanchaDeporte } from '../../models/cancha-deporte.model';

@Injectable({
  providedIn: 'root'
})

export class CanchaDeportesService {
  apiUrl = environment.backendUrl + '/canchasDeporte';

  constructor(private http: HttpClient) { }

  getAll(): Observable<CanchaDeporte[]> {
    return this.http.get<CanchaDeporte[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<CanchaDeporte>{
    return this.http.get<CanchaDeporte>(`${this.apiUrl}/${uuid}`);
  }
  save(data: CanchaDeporte): Observable<CanchaDeporte> {    
    return this.http.post<CanchaDeporte>(`${this.apiUrl}`, data);
  }

  update(data: CanchaDeporte): Observable<CanchaDeporte> {
    return this.http.put<CanchaDeporte>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
