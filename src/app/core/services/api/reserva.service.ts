import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Reserva } from '../../models/reserva.models';

@Injectable({
  providedIn: 'root'
})
export class ReservaService {
  apiUrl = environment.backendUrl + '/reservas';

  constructor(private http: HttpClient) { }

  getAll(page: number = 0, size: number = 20): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<Reserva[]>(`${this.apiUrl}`, { params });
  }

  getByUuid(uuid: string): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.apiUrl}/${uuid}`);
  }

  getByNumeroReserva(numeroReserva: string): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.apiUrl}/numero/${numeroReserva}`);
  }

  getByFechaReserva(fechaIni: Date, fechaFin: Date, page: number = 0, size: number = 20): Observable<Reserva[]> {
    let params = new HttpParams()
      .set('fechaIni', fechaIni.toISOString())
      .set('fechaFin', fechaFin.toISOString())
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<Reserva[]>(`${this.apiUrl}/buscar/fechas`, { params });
  }

  getByCampoDeportivo(uuidCampo: string): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/campo/${uuidCampo}`);
  }

  getByContribuyente(uuidContribuyente: string): Observable<any[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/contribuyente/${uuidContribuyente}`);
  }

  getByEstado(estadoReserva: string): Observable<any[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/estado/${estadoReserva}`);
  }

  getByTipo(tipoReserva: string): Observable<any> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/tipo/${tipoReserva}`);
  }

  getActivasByCampoYFecha(uuidCampo: string, fechaIni: Date, fechaFin: Date): Observable<Reserva[]> {
    let params = new HttpParams()
      .set('fechaIni', fechaIni.toISOString())
      .set('fechaFin', fechaFin.toISOString());
    
    return this.http.get<Reserva[]>(`${this.apiUrl}/activas/campo/${uuidCampo}`, { params });
  }

  // Approval Workflow Methods
  aprobarReserva(uuid: String, aprobadoPor: string): Observable<Reserva> {
    let params = new HttpParams().set('aprobadoPor', aprobadoPor);
    return this.http.put<Reserva>(`${this.apiUrl}/${uuid}/aprobar`, null, { params });
  }

  rechazarReserva(uuid: String, motivoRechazo: string, aprobadoPor: string): Observable<Reserva> {
    let params = new HttpParams()
      .set('motivoRechazo', motivoRechazo)
      .set('aprobadoPor', aprobadoPor);
    
    return this.http.put<Reserva>(`${this.apiUrl}/${uuid}/rechazar`, null, { params });
  }

  cancelarReserva(uuid: string, motivo: string): Observable<Reserva> {
    let params = new HttpParams().set('motivo', motivo);
    return this.http.put<Reserva>(`${this.apiUrl}/${uuid}/cancelar`, null, { params });
  }

  // Conflict Detection
  verificarConflictos(uuidCampo: string, fechaIni: Date, fechaFin: Date, excludeReservaUuid?: string): Observable<boolean> {
    let params = new HttpParams()
      .set('uuidCampo', uuidCampo)
      .set('fechaIni', fechaIni.toISOString())
      .set('fechaFin', fechaFin.toISOString());
    
    if (excludeReservaUuid) {
      params = params.set('excludeReservaUuid', excludeReservaUuid);
    }
    
    return this.http.get<boolean>(`${this.apiUrl}/verificar/conflictos`, { params });
  }

  // CRUD Operations
  create(data: Reserva): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.apiUrl}`, data);
  }

  update(data: Reserva): Observable<Reserva> {
    return this.http.put<Reserva>(`${this.apiUrl}`, data);
  }

  delete(uuid: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }

  // Counting and Statistics
  countByEstado(estadoReserva: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/contador/estado/${estadoReserva}`);
  }

  countByCampoYEstado(uuidCampo: string, estadoReserva: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/contador/campo/${uuidCampo}/estado/${estadoReserva}`);
  }

  // Approval Requirements Check
  verificarRequisitosAprobacion(uuidCampo: string, reservaData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/campo/${uuidCampo}/verificar-aprobacion`, reservaData);
  }
}