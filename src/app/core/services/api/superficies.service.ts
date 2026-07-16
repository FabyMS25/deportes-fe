/**Core */
import { catchError, map, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { handleError, handleResponse } from '../apiResponses';

/**Models */
import { Superficie } from '../../models/superficie.model';

@Injectable({
  providedIn: 'root'
})

export class SuperficiesService {
  apiUrl = environment.backendUrl + '/superficie';

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

  getAll(): Observable<Superficie[]> {
    return this.get<Superficie[]>(this.apiUrl, 'obtener superficies');
  }

  getByUuid(uuid:string):Observable<Superficie>{
    return this.get<Superficie>(`${this.apiUrl}/${uuid}`, `obtener superficie (${uuid})`);
  }
  save(data: Superficie): Observable<Superficie> {
    return this.post<Superficie>(this.apiUrl, data, 'guardar superficie');
  }

  update(data: Superficie): Observable<Superficie> {
    return this.put<Superficie>(this.apiUrl, data, 'actualizar superficie');
  }
  delete(uuid: string): Observable<string> {
    return this.remove<string>(`${this.apiUrl}/${uuid}`, `eliminar superficie (${uuid})`);
  }
}
