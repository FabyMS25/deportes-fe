/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})

export class ReportsService {

  private readonly apiUrl = `${environment.backendUrl}/reporte`;

  constructor(private http: HttpClient) { }

  getDatesReport(strParams: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/lista-reservas?${strParams}`,
      {
        responseType: 'arraybuffer' as 'json'
      }
    );
  }
  getPaymentsReport(strParams: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/lista-pagos?${strParams}`,
      {
        responseType: 'arraybuffer' as 'json'
      }
    );
  }
  getReportByDepartment(desde: string, hasta: string, departmentUuid: string, status: number) {
    let params = new HttpParams();
    params = params.append('desde', desde);
    params = params.append('hasta', hasta);
    params = params.append('unidad', departmentUuid);
    params = params.append('estado', status);
    return this.http.get(`${this.apiUrl}/generar`, { responseType: 'blob', params });
  }

  
  getTicket(uuid: string): Observable<any> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return this.http.get<any>(`${this.apiUrl}/ticket-reservap?${params}`,
      {
        responseType: 'arraybuffer' as 'json'
      }
    );
  }  
  getPayTicket(uuid: string): Observable<any> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return this.http.get<any>(`${this.apiUrl}/ticket-pago?${params}`,
      {
        responseType: 'arraybuffer' as 'json'
      }
    );
  }
}
