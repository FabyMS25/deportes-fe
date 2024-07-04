/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { Categoria } from '../../models/categoria.model';

/**Models */

@Injectable({
  providedIn: 'root'
})

export class DeportesService {
  apiUrl = environment.backendUrl + '/deportes';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<Categoria>{
    return this.http.get<Categoria>(`${this.apiUrl}/${uuid}`);
  }
  save(data: Categoria): Observable<Categoria> {    
    return this.http.post<Categoria>(`${this.apiUrl}`, data);
  }

  update(data: Categoria): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
