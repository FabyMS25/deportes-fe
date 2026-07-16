/**Core */
import { catchError, map, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { Categoria } from '../../models/categoria.model';
import { handleError, handleResponse } from '../apiResponses';

/**Models */

@Injectable({
  providedIn: 'root'
})

export class CategoriasService {
  apiUrl = environment.backendUrl + '/categorias';

  constructor(private http: HttpClient) { }

  private get<T>(route: string, operation: string): Observable<T> {
    return this.http.get<unknown>(route).pipe(
      map(response => handleResponse<T>(response)),
      catchError(handleError(operation))
    );
  }

  private post<T>(route: string, data: unknown, operation: string): Observable<T> {
    return this.http.post<unknown>(route, data).pipe(
      map(response => handleResponse<T>(response)),
      catchError(handleError(operation))
    );
  }

  private put<T>(route: string, data: unknown, operation: string): Observable<T> {
    return this.http.put<unknown>(route, data).pipe(
      map(response => handleResponse<T>(response)),
      catchError(handleError(operation))
    );
  }

  private remove<T>(route: string, operation: string): Observable<T> {
    return this.http.delete<unknown>(route).pipe(
      map(response => handleResponse<T>(response)),
      catchError(handleError(operation))
    );
  }

  getAll(): Observable<Categoria[]> {
    return this.get<Categoria[]>(this.apiUrl, 'obtener categorías');
  }

  getByUuid(uuid:string):Observable<Categoria>{
    return this.get<Categoria>(`${this.apiUrl}/${uuid}`, `obtener categoría (${uuid})`);
  }
  save(data: Categoria): Observable<Categoria> {    
    return this.post<Categoria>(this.apiUrl, data, 'guardar categoría');
  }

  update(data: Categoria): Observable<Categoria> {
    return this.put<Categoria>(this.apiUrl, data, 'actualizar categoría');
  }
  delete(uuid: string): Observable<string> {
    return this.remove<string>(`${this.apiUrl}/${uuid}`, `eliminar categoría (${uuid})`);
  }
}
