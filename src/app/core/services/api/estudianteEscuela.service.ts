import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EstudianteEscuela } from '../../models/EstudianteEscuela.model';
import { ApiResponse } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class EstudianteEscuelaService {

  apiUrl = environment.backendUrl + '/estudiante-escuela';

  constructor(private http: HttpClient) { }

  // Basic CRUD Operations
  getAll(): Observable<ApiResponse<EstudianteEscuela[]>> {
    return this.http.get<ApiResponse<EstudianteEscuela[]>>(this.apiUrl);
  }

  getByUuid(uuid: string): Observable<ApiResponse<EstudianteEscuela>> {
    return this.http.get<ApiResponse<EstudianteEscuela>>(`${this.apiUrl}/${uuid}`);
  }

  getByMatricula(matricula: string): Observable<ApiResponse<EstudianteEscuela>> {
    return this.http.get<ApiResponse<EstudianteEscuela>>(`${this.apiUrl}/matricula/${matricula}`);
  }

  save(data: EstudianteEscuela): Observable<ApiResponse<EstudianteEscuela>> {
    return this.http.post<ApiResponse<EstudianteEscuela>>(this.apiUrl, data);
  }

  update(data: EstudianteEscuela): Observable<ApiResponse<EstudianteEscuela>> {
    return this.http.put<ApiResponse<EstudianteEscuela>>(this.apiUrl, data);
  }

  delete(uuid: string): Observable<ApiResponse<EstudianteEscuela>> {
    return this.http.delete<ApiResponse<EstudianteEscuela>>(`${this.apiUrl}/${uuid}`);
  }

  // Business Operations
  getByContribuyente(contribuyenteUuid: string): Observable<ApiResponse<EstudianteEscuela[]>> {
    return this.http.get<ApiResponse<EstudianteEscuela[]>>(`${this.apiUrl}/contribuyente/${contribuyenteUuid}`);
  }

  getActivos(): Observable<ApiResponse<EstudianteEscuela[]>> {
    return this.http.get<ApiResponse<EstudianteEscuela[]>>(`${this.apiUrl}/activos`);
  }

  darDeBaja(uuid: string): Observable<ApiResponse<EstudianteEscuela>> {
    return this.http.put<ApiResponse<EstudianteEscuela>>(`${this.apiUrl}/${uuid}/baja`, null);
  }

  reactivar(uuid: string): Observable<ApiResponse<EstudianteEscuela>> {
    return this.http.put<ApiResponse<EstudianteEscuela>>(`${this.apiUrl}/${uuid}/reactivar`, null);
  }
}
