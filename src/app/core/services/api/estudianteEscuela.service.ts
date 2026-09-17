import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EstudianteEscuela } from '../../models/EstudianteEscuela.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class EstudianteEscuelaService {

  apiUrl = environment.backendUrl + '/estudiante-escuela';

  constructor(private http: HttpClient) { }

  getAll(): Observable<EstudianteEscuela[]> {
    return apiGet<EstudianteEscuela[]>(this.http, this.apiUrl, 'obtener estudiantes escuela');
  }

  getByUuid(uuid: string): Observable<EstudianteEscuela> {
    return apiGet<EstudianteEscuela>(this.http, `${this.apiUrl}/${uuid}`, `obtener estudiante escuela (${uuid})`);
  }

  getByMatricula(matricula: string): Observable<EstudianteEscuela> {
    return apiGet<EstudianteEscuela>(this.http, `${this.apiUrl}/matricula/${matricula}`, `obtener estudiante por matrícula (${matricula})`);
  }

  save(data: EstudianteEscuela): Observable<EstudianteEscuela> {
    return apiPost<EstudianteEscuela>(this.http, this.apiUrl, data, 'guardar estudiante escuela');
  }

  update(data: EstudianteEscuela): Observable<EstudianteEscuela> {
    return apiPut<EstudianteEscuela>(this.http, this.apiUrl, data, 'actualizar estudiante escuela');
  }

  delete(uuid: string): Observable<EstudianteEscuela> {
    return apiDelete<EstudianteEscuela>(this.http, `${this.apiUrl}/${uuid}`, `anular estudiante escuela (${uuid})`);
  }

  getByTaxpayer(contribuyenteUuid: string): Observable<EstudianteEscuela[]> {
    return apiGet<EstudianteEscuela[]>(this.http, `${this.apiUrl}/contribuyente/${contribuyenteUuid}`, `obtener estudiantes por contribuyente (${contribuyenteUuid})`);
  }

  getBySchool(organizacionUuid: string, onlyActive = true): Observable<EstudianteEscuela[]> {
    const suffix = onlyActive ? '/activos' : '';
    return apiGet<EstudianteEscuela[]>(this.http,
      `${this.apiUrl}/organizacion/${organizacionUuid}${suffix}`,
      `obtener inscripciones de escuela (${organizacionUuid})`);
  }

  getActivos(): Observable<EstudianteEscuela[]> {
    return apiGet<EstudianteEscuela[]>(this.http, `${this.apiUrl}/activos`, 'obtener estudiantes activos');
  }

  darDeBaja(uuid: string, motivoBaja?: string): Observable<EstudianteEscuela> {
    return apiPut<EstudianteEscuela>(this.http, `${this.apiUrl}/${uuid}/baja`,
      { motivoBaja: motivoBaja?.trim() || undefined }, `dar de baja estudiante (${uuid})`);
  }

  reactivar(uuid: string): Observable<EstudianteEscuela> {
    return apiPut<EstudianteEscuela>(this.http, `${this.apiUrl}/${uuid}/reactivar`, null, `reactivar estudiante (${uuid})`);
  }

  quitarResponsable(uuid: string): Observable<EstudianteEscuela> {
    return apiPut<EstudianteEscuela>(this.http,
      `${this.apiUrl}/${uuid}/quitar-responsable`, null,
      `quitar responsable de inscripción (${uuid})`);
  }
}
