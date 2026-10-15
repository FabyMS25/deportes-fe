import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Contribuyente } from '../../models/contribuyente.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class ContribuyentesService {

    apiUrl = environment.backendUrl + '/contribuyente';

  constructor(private http: HttpClient) { }

  loginByUsername(user: String, pass: String) {
    return apiPost<any>(this.http, `${this.apiUrl}/login`, { user, pass }, 'loguear contribuyente');
  }
  
  getAll(): Observable<Contribuyente[]> {
    return apiGet<Contribuyente[]>(this.http, this.apiUrl, 'obtener contribuyentes');
  }

  getByUuid(uuid: String): Observable<Contribuyente> {
    return apiGet<Contribuyente>(this.http, `${this.apiUrl}/${uuid}`, `obtener contribuyente (${uuid})`)
  }

  getByEmail(email: String): Observable<Contribuyente> {
    return apiGet<Contribuyente>(this.http, `${this.apiUrl}/email/${email}`, `obtener contribuyente por email (${email})`)
  }

  publicExists(criteria: {
    numeroDocumento?: string;
    email?: string;
    userName?: string;
  }): Observable<{ numeroDocumento?: boolean; email?: boolean; userName?: boolean }> {
    return apiGet(this.http, `${this.apiUrl}/public/exists`, 'validar existencia de contribuyente', {
      params: criteria
    });
  }

  save(data: Contribuyente): Observable<Contribuyente> {
    return apiPost<Contribuyente>(this.http, this.apiUrl, data, 'guardar contribuyente');
  }

  update(data: Contribuyente): Observable<Contribuyente> {
    return apiPut<Contribuyente>(this.http, this.apiUrl, data, 'actualizar contribuyente');
  }

  changePassword(uuid: string, currentPassword: string, newPassword: string): Observable<string> {
    return apiPost<string>(this.http, `${this.apiUrl}/change-password`,
      { uuid, currentPassword, newPassword }, 'cambiar contraseña de contribuyente');
  }

  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `anular contribuyente (${uuid})`);
  }
}


