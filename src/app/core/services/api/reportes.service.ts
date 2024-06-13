/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})

export class ReportesService {

  private readonly URL = `${environment.backendUrl}/reporte-reclamos`;

  constructor(private http: HttpClient) { }

  getReportByDepartment(desde: string, hasta: string, departmentUuid: string, status: number) {
    let params = new HttpParams();
    params = params.append('desde', desde);
    params = params.append('hasta', hasta);
    params = params.append('unidad', departmentUuid);
    params = params.append('estado', status);
    return this.http.get(`${this.URL}/generar`, { responseType: 'blob', params });
  }
}
