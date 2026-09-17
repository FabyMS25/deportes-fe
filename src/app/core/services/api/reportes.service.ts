import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

/** Environments */
import { environment } from 'src/environments/environment';
import { apiGet } from '../apiResponses';

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
    
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/lista-Reservas`, 'generar reporte de reservas puntuales', {
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
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/lista-Recurrentes`, 'generar reporte de reservas recurrentes', {
      responseType: 'arraybuffer',
      params
    });
  }

  getMonthlyReport(
    fechaini: string, 
    fechafin: string, 
    estado: string = 'TODO',
    escuelita: string = 'TODO',
    estudiante: string = 'TODO'
  ): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('fechaini', fechaini);
    params = params.append('fechafin', fechafin);
    params = params.append('estado', estado);
    params = params.append('escuelita', escuelita);
    params = params.append('estudiante', estudiante);
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/lista-mensuales`, 'generar reporte mensual', {
      responseType: 'arraybuffer',
      params
    });
  }
  
  getStudentMonthlyReport(
    fechaini: string, 
    fechafin: string, 
    estado: string = 'TODO',
    matricula: string = 'TODO',
    alumno: string = 'TODO'
  ): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('fechaini', fechaini);
    params = params.append('fechafin', fechafin);
    params = params.append('estado', estado);
    params = params.append('matricula', matricula);
    params = params.append('alumno', alumno);
    
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/lista-alumno`, 'generar reporte mensual por estudiante', {
      responseType: 'arraybuffer',
      params
    });
  }
  
  getPaymentsReport(fecha_ini: string, fecha_fin: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('fecha_ini', fecha_ini);
    params = params.append('fecha_fin', fecha_fin);
    
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/lista-Pagos`, 'generar reporte de pagos', {
      responseType: 'arraybuffer',
      params
    });
  }
  
  getTicketReservaPuntual(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/ticket-reservap`, `generar ticket de reserva puntual (${uuid})`, {
      responseType: 'arraybuffer',
      params
    });
  }
  getTicketReservaPersona(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/ticket-reser-per`, `generar ticket de reserva persona (${uuid})`, {
      responseType: 'arraybuffer',
      params
    });
  }
  getTicketReservaEvento(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/ticket-reser-ev`, `generar ticket de reserva evento (${uuid})`, {
      responseType: 'arraybuffer',
      params
    });
  }
  
  getTicketRecurrenteSesion(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/ticket-recuses`, `generar ticket de sesión recurrente (${uuid})`, {
      responseType: 'arraybuffer',
      params
    });
  }
  getTicketRecurrentePersona(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/ticket-recuper`, `generar ticket de reserva recurrente (${uuid})`, {
      responseType: 'arraybuffer',
      params
    });
  }
  getTicketRecurrenteMensualidad(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/ticket-recumes`, `generar ticket de mensualidad recurrente (${uuid})`, {
      responseType: 'arraybuffer',
      params
    });
  }
  
  getTicketByPeriodo(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/ticket-mensual`, `generar ticket mensual (${uuid})`, {
      responseType: 'arraybuffer',
      params
    });
  }

  getPayTicket(uuid: string): Observable<ArrayBuffer> {
    let params = new HttpParams();
    params = params.append('uuid', uuid);
    return apiGet<ArrayBuffer>(this.http, `${this.apiUrl}/ticket-pago`, `generar ticket de pago (${uuid})`, {
      responseType: 'arraybuffer',
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

  downloadPuntualReport(
    fechaini: string, 
    fechafin: string, 
    tipocobro: string = 'TODO', 
    estado: string = 'TODO',
    cancha: string = 'TODO',
    filename: string = 'reporte-puntual.pdf'
  ): void {
    this.downloadPdf(
      this.getPuntualReport(fechaini, fechafin, tipocobro, estado, cancha),
      filename
    );
  }

  downloadRecurrentReport(
    fechaini: string, 
    fechafin: string, 
    tipocobro: string = 'TODO', 
    estado: string = 'TODO',
    cancha: string = 'TODO',
    filename: string = 'reporte-recurrente.pdf'
  ): void {
    this.downloadPdf(
      this.getRecurrentReport(fechaini, fechafin, tipocobro, estado, cancha),
      filename
    );
  }

  downloadMonthlyReport(
    fechaini: string, 
    fechafin: string, 
    estado: string = 'TODO',
    escuelita: string = 'TODO',
    filename: string = 'reporte-mensual.pdf'
  ): void {
    this.downloadPdf(
      this.getMonthlyReport(fechaini, fechafin, estado, escuelita),
      filename
    );
  }

  downloadPaymentsReport(
    fecha_ini: string, 
    fecha_fin: string,
    filename: string = 'reporte-pagos.pdf'
  ): void {
    this.downloadPdf(
      this.getPaymentsReport(fecha_ini, fecha_fin),
      filename
    );
  }

  downloadTicketReservaPuntual(uuid: string, filename: string = 'ticket-reserva-puntual.pdf'): void {
    this.downloadPdf(this.getTicketReservaPuntual(uuid), filename);
  }

  downloadTicketReservaPersona(uuid: string, filename: string = 'ticket-reserva-persona.pdf'): void {
    this.downloadPdf(this.getTicketReservaPersona(uuid), filename);
  }

  downloadTicketReservaEvento(uuid: string, filename: string = 'ticket-reserva-evento.pdf'): void {
    this.downloadPdf(this.getTicketReservaEvento(uuid), filename);
  }

  downloadTicketRecurrenteSesion(uuid: string, filename: string = 'ticket-recurrente-sesion.pdf'): void {
    this.downloadPdf(this.getTicketRecurrenteSesion(uuid), filename);
  }

  downloadTicketRecurrentePersona(uuid: string, filename: string = 'ticket-recurrente-persona.pdf'): void {
    this.downloadPdf(this.getTicketRecurrentePersona(uuid), filename);
  }

  downloadTicketRecurrenteMensualidad(uuid: string, filename: string = 'ticket-recurrente-mensualidad.pdf'): void {
    this.downloadPdf(this.getTicketRecurrenteMensualidad(uuid), filename);
  }

  downloadTicketMensual(uuid: string, filename: string = 'ticket-mensual.pdf'): void {
    this.downloadPdf(this.getTicketByPeriodo(uuid), filename);
  }
}
