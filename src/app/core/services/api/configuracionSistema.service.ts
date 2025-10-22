import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**Enviroments */
import { environment } from 'src/environments/environment';
import { ConfiguracionSistema } from '../../models/configuracionSistema.model';

/**Models */
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.sessionStorage.getItem('auth-token')}` })
};

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionSistemaService {
  apiUrl = environment.backendUrl + '/configuracionSistema';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${uuid}`);
  }

  getByClave(clave: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/clave/${clave}`);
  }

  getByCategoria(categoria: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categoria/${categoria}`);
  }

  getByAplicaA(aplicaA: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/aplicaA/${aplicaA}`);
  }

  getByReferenciaUuid(referenciaUuid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/referencia/${referenciaUuid}`);
  }

  getModificablesPorUsuario(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/modificables/usuario`);
  }

  getCategorias(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categorias`);
  }

  save(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data, httpOptions);
  }

  update(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}`, data, httpOptions);
  }

  updateByClave(clave: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/clave/${clave}`, data, httpOptions);
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${uuid}`, httpOptions);
  }

  desactivar(uuid: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/desactivar/${uuid}`, {}, httpOptions);
  }

  // Métodos utilitarios para obtener valores específicos
  getValorTexto(clave: string, valorPorDefecto: string = ''): Observable<string> {
    return new Observable(observer => {
      this.getByClave(clave).subscribe({
        next: (response) => {
          const valor = response.payload?.valorTexto || valorPorDefecto;
          observer.next(valor);
          observer.complete();
        },
        error: () => {
          observer.next(valorPorDefecto);
          observer.complete();
        }
      });
    });
  }

  getValorNumerico(clave: string, valorPorDefecto: number = 0): Observable<number> {
    return new Observable(observer => {
      this.getByClave(clave).subscribe({
        next: (response) => {
          const valor = response.payload?.valorNumerico || valorPorDefecto;
          observer.next(valor);
          observer.complete();
        },
        error: () => {
          observer.next(valorPorDefecto);
          observer.complete();
        }
      });
    });
  }

  getValorBoolean(clave: string, valorPorDefecto: boolean = false): Observable<boolean> {
    return new Observable(observer => {
      this.getByClave(clave).subscribe({
        next: (response) => {
          const valor = response.payload?.valorBoolean !== null ? response.payload?.valorBoolean : valorPorDefecto;
          observer.next(valor);
          observer.complete();
        },
        error: () => {
          observer.next(valorPorDefecto);
          observer.complete();
        }
      });
    });
  }
}