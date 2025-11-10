import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { Organizacion } from '../../models/organizacion.models';

@Injectable({
  providedIn: 'root'
})
export class OrganizacionService {

    apiUrl = environment.backendUrl + '/organizaciones';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: String): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${uuid}`)
  }

  save(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  update(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }
  
  getByRepresentante(contribuyenteUuid: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/representante/${contribuyenteUuid}`);
  }

  getByContribuyente(contribuyenteUuid: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/contribuyente/${contribuyenteUuid}`);
  }
}


