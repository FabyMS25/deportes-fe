import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

/** Environments */
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  private readonly apiUrl = `${environment.backendUrl}/reporte`;

  constructor(private http: HttpClient) { }

  getPuntualReport(
    fechaini: string, 
    fechafin: string, 
    tipocobro: string = 'TODO', 
    estado: string = 'TODO',
    cancha: string = 'TODO'
  ): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('fechaini', fechaini);
    params = params.append('fechafin', fechafin);
    params = params.append('tipocobro', tipocobro);
    params = params.append('estado', estado);
    params = params.append('cancha', cancha);
    
    return this.http.get(`${this.apiUrl}/lista-Reservas`, {
      responseType: 'arraybuffer',
      params
    });
  }

  getRecurrentReport(
    fechaini: string, 
    fechafin: string, 
    tipocobro: string = 'TODO', 
    estado: string = 'TODO',
    cancha: string = 'TODO'
  ): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('fechaini', fechaini);
    params = params.append('fechafin', fechafin);
    params = params.append('tipocobro', tipocobro);
    params = params.append('estado', estado);
    params = params.append('cancha', cancha);
    
    return this.http.get(`${this.apiUrl}/lista-Recurrentes`, {
      responseType: 'arraybuffer',
      params
    });
  }

  getPaymentsReport(fecha_ini: string, fecha_fin: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('fecha_ini', fecha_ini);
    params = params.append('fecha_fin', fecha_fin);
    
    return this.http.get(`${this.apiUrl}/lista-Pagos`, {
      responseType: 'arraybuffer',
      params
    });
  }

  // Ticket Reports
  getTicketReservaPuntual(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return this.http.get(`${this.apiUrl}/ticket-reservap`, {
      responseType: 'arraybuffer',
      params
    });
  }

  getTicketReservaPersona(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return this.http.get(`${this.apiUrl}/ticket-reser-per`, {
      responseType: 'arraybuffer',
      params
    });
  }

  getTicketReservaEvento(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return this.http.get(`${this.apiUrl}/ticket-reser-ev`, {
      responseType: 'arraybuffer',
      params
    });
  }

  getTicketRecurrenteSesion(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return this.http.get(`${this.apiUrl}/ticket-recuses`, {
      responseType: 'arraybuffer',
      params
    });
  }

  getTicketRecurrentePersona(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return this.http.get(`${this.apiUrl}/ticket-recuper`, {
      responseType: 'arraybuffer',
      params
    });
  }

  getTicketRecurrenteMensualidad(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return this.http.get(`${this.apiUrl}/ticket-recumes`, {
      responseType: 'arraybuffer',
      params
    });
  }

  getPayTicket(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return this.http.get(`${this.apiUrl}/ticket-pago`, {
      responseType: 'arraybuffer',
      params
    });
  }

  getReportByDepartment(desde: string, hasta: string, departmentUuid: string, status: number): Observable<Blob> {
    let params = new HttpParams();
    params = params.append('desde', desde);
    params = params.append('hasta', hasta);
    params = params.append('unidad', departmentUuid);
    params = params.append('estado', status);
    return this.http.get(`${this.apiUrl}/generar`, { 
      responseType: 'blob', 
      params 
    });
  }

  downloadPdf(observable: Observable<ArrayBuffer>, filename: string = 'report.pdf'): void {
    observable.subscribe({
      next: (data: ArrayBuffer) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
      }
    });
  }
}