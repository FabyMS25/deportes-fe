/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { TarifaCategoria } from '../../models/tarifa-categoria.model';

/**Models */

@Injectable({
  providedIn: 'root'
})

export class TarifaCategoriesService {
  apiUrl = environment.backendUrl + '/tarifacategoria';

  constructor(private http: HttpClient) { }

  getAll(): Observable<TarifaCategoria[]> {
    return this.http.get<TarifaCategoria[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid:string):Observable<TarifaCategoria>{
    return this.http.get<TarifaCategoria>(`${this.apiUrl}/${uuid}`);
  }
  save(data: TarifaCategoria): Observable<TarifaCategoria> {    
    return this.http.post<TarifaCategoria>(`${this.apiUrl}`, data);
  }

  update(data: TarifaCategoria): Observable<TarifaCategoria> {
    return this.http.put<TarifaCategoria>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
}
