import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReservaPeriodoService {

  apiUrl = environment.backendUrl + '/reservas-periodo';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${uuid}`);
  }

  getByMatricula(matricula: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/matricula/${matricula}`);
  }

  save(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  update(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}`, data);
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }

  // Business Operations
  getByContribuyente(contribuyenteUuid: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/contribuyente/${contribuyenteUuid}`);
  }

  getByEscuela(codigoEscuela: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/escuela/${codigoEscuela}`);
  }

  getActivos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/activos`);
  }

  getInactivos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/inactivos`);
  }

  inactivarEstudiante(uuid: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${uuid}/inactivar`, {});
  }

  activarEstudiante(uuid: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${uuid}/activar`, {});
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