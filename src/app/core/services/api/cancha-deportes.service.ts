/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { CanchaCategoria } from '../../models/cancha-categoria.model';

/**Models */

@Injectable({
  providedIn: 'root'
})

export class CanchaDeportesService {
  apiUrl = environment.backendUrl + '/canchasDeporte';

  constructor(private http: HttpClient) { }

  getAll(): Observable<CanchaCategoria[]> {
    return this.http.get<CanchaCategoria[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<CanchaCategoria>{
    return this.http.get<CanchaCategoria>(`${this.apiUrl}/${uuid}`);
  }
  save(data: CanchaCategoria): Observable<CanchaCategoria> {    
    return this.http.post<CanchaCategoria>(`${this.apiUrl}`, data);
  }

  update(data: CanchaCategoria): Observable<CanchaCategoria> {
    return this.http.put<CanchaCategoria>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
