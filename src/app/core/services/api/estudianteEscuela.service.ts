import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EstudianteEscuela } from '../../models/EstudianteEscuela.model';

@Injectable({
  providedIn: 'root'
})
export class EstudianteEscuelaService {

  apiUrl = environment.backendUrl + '/estudiante-escuela';

  constructor(private http: HttpClient) { }

  // Basic CRUD Operations
  getAll(): Observable<EstudianteEscuela[]> {
    return this.http.get<EstudianteEscuela[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: string): Observable<EstudianteEscuela> {
    return this.http.get<EstudianteEscuela>(`${this.apiUrl}/${uuid}`);
  }

  getByMatricula(matricula: string): Observable<EstudianteEscuela> {
    return this.http.get<EstudianteEscuela>(`${this.apiUrl}/matricula/${matricula}`);
  }

  save(data: EstudianteEscuela): Observable<EstudianteEscuela> {
    return this.http.post<EstudianteEscuela>(`${this.apiUrl}`, data);
  }

  update(data: EstudianteEscuela): Observable<EstudianteEscuela> {
    return this.http.put<EstudianteEscuela>(`${this.apiUrl}`, data);
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }

  // Business Operations
  getByContribuyente(contribuyenteUuid: string): Observable<EstudianteEscuela[]> {
    return this.http.get<EstudianteEscuela[]>(`${this.apiUrl}/contribuyente/${contribuyenteUuid}`);
  }

  getByEscuela(codigoEscuela: string): Observable<EstudianteEscuela[]> {
    return this.http.get<EstudianteEscuela[]>(`${this.apiUrl}/escuela/${codigoEscuela}`);
  }

  getActivos(): Observable<EstudianteEscuela[]> {
    return this.http.get<EstudianteEscuela[]>(`${this.apiUrl}/activos`);
  }

  getInactivos(): Observable<EstudianteEscuela[]> {
    return this.http.get<EstudianteEscuela[]>(`${this.apiUrl}/inactivos`);
  }

  inactivarEstudiante(uuid: string): Observable<EstudianteEscuela> {
    return this.http.patch<EstudianteEscuela>(`${this.apiUrl}/${uuid}/inactivar`, {});
  }

  activarEstudiante(uuid: string): Observable<EstudianteEscuela> {
    return this.http.patch<EstudianteEscuela>(`${this.apiUrl}/${uuid}/activar`, {});
  }

  generarMatricula(codigoEscuela: string): Observable<{ matricula: string }> {
    return this.http.get<{ matricula: string }>(`${this.apiUrl}/generar-matricula/${codigoEscuela}`);
  }

  // Payment related operations
  getMensualidadesByEstudiante(estudianteUuid: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${estudianteUuid}/mensualidades`);
  }

  getMensualidadesPendientes(estudianteUuid: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${estudianteUuid}/mensualidades-pendientes`);
  }
}