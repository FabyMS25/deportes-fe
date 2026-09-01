import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { ConfiguracionSistema } from '../../models/configuracionSistema.model';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class SystemConfigurationService {
  apiUrl = environment.backendUrl + '/system-configurations';

  constructor(private http: HttpClient) { }

  getAll(token?: string): Observable<ConfiguracionSistema[]> {
    const options = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined;
    return apiGet<ConfiguracionSistema[]>(
      this.http,
      this.apiUrl,
      'obtener configuraciones del sistema',
      options
    );
  }

  getByUuid(uuid: string): Observable<ConfiguracionSistema> {
    return apiGet<ConfiguracionSistema>(this.http, `${this.apiUrl}/${uuid}`, `obtener configuración (${uuid})`);
  }

  getByClave(clave: string): Observable<ConfiguracionSistema> {
    return apiGet<ConfiguracionSistema>(this.http, `${this.apiUrl}/clave/${clave}`, `obtener configuración (${clave})`);
  }

  getByCategoria(categoria: string): Observable<ConfiguracionSistema[]> {
    return apiGet<ConfiguracionSistema[]>(this.http, `${this.apiUrl}/categoria/${categoria}`, `obtener configuraciones por categoría (${categoria})`);
  }

  getByAplicaA(aplicaA: string): Observable<ConfiguracionSistema[]> {
    return apiGet<ConfiguracionSistema[]>(this.http, `${this.apiUrl}/aplicaA/${aplicaA}`, `obtener configuraciones por aplica a (${aplicaA})`);
  }

  getByReferenciaUuid(referenciaUuid: string): Observable<ConfiguracionSistema[]> {
    return apiGet<ConfiguracionSistema[]>(this.http, `${this.apiUrl}/referencia/${referenciaUuid}`, `obtener configuraciones por referencia (${referenciaUuid})`);
  }

  getModificablesPorUsuario(): Observable<ConfiguracionSistema[]> {
    return apiGet<ConfiguracionSistema[]>(this.http, `${this.apiUrl}/modificables/usuario`, 'obtener configuraciones modificables por usuario');
  }

  getCategories(): Observable<string[]> {
    return apiGet<string[]>(this.http, `${this.apiUrl}/categorias`, 'obtener categorías de configuración');
  }

  save(data: any): Observable<ConfiguracionSistema> {
    return apiPost<ConfiguracionSistema>(this.http, this.apiUrl, data, 'guardar configuración');
  }

  update(data: any): Observable<ConfiguracionSistema> {
    return apiPut<ConfiguracionSistema>(this.http, this.apiUrl, data, 'actualizar configuración');
  }

  updateByClave(clave: string, data: any): Observable<ConfiguracionSistema> {
    return apiPut<ConfiguracionSistema>(this.http, `${this.apiUrl}/clave/${clave}`, data, `actualizar configuración (${clave})`);
  }

  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `eliminar configuración (${uuid})`);
  }

  desactivar(uuid: string): Observable<ConfiguracionSistema> {
    return apiPut<ConfiguracionSistema>(this.http, `${this.apiUrl}/desactivar/${uuid}`, {}, `desactivar configuración (${uuid})`);
  }

  // Métodos utilitarios para obtener valores específicos
  getValorTexto(clave: string, valorPorDefecto: string = ''): Observable<string> {
    return this.getByClave(clave).pipe(
      map(config => config?.valorTexto || valorPorDefecto),
      catchError(() => of(valorPorDefecto))
    );
  }

  getValorNumerico(clave: string, valorPorDefecto: number = 0): Observable<number> {
    return this.getByClave(clave).pipe(
      map(config => config?.valorNumerico ?? valorPorDefecto),
      catchError(() => of(valorPorDefecto))
    );
  }

  getValorBoolean(clave: string, valorPorDefecto: boolean = false): Observable<boolean> {
    return this.getByClave(clave).pipe(
      map(config => typeof config?.valorBoolean === 'boolean'
        ? config.valorBoolean
        : valorPorDefecto),
      catchError(() => of(valorPorDefecto))
    );
  }
}
