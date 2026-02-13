import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaAuditoria } from '../../models/reservaAuditoria.model';

@Injectable({
  providedIn: 'root'
})
export class ReservaAuditoriaService {
  apiUrl = environment.backendUrl + '/reservas-auditorias';

  constructor(private http: HttpClient) { }

  getByUuid(uuid: string): Observable<ReservaAuditoria> {
    return this.http.get<ReservaAuditoria>(`${this.apiUrl}/${uuid}`);
  }

  getByReservaUuid(reservaUuid: string, page: number = 0, size: number = 20): Observable<ReservaAuditoria[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<ReservaAuditoria[]>(`${this.apiUrl}/reserva/${reservaUuid}`, { params });
  }

  getUltimasByReserva(reservaUuid: string, limite: number = 10): Observable<ReservaAuditoria[]> {
    let params = new HttpParams().set('limite', limite.toString());
    return this.http.get<ReservaAuditoria[]>(`${this.apiUrl}/reserva/${reservaUuid}/ultimas`, { params });
  }

  getByAccion(accion: string): Observable<ReservaAuditoria[]> {
    return this.http.get<ReservaAuditoria[]>(`${this.apiUrl}/accion/${accion}`);
  }

  getByFecha(fechaInicio: Date, fechaFin: Date, page: number = 0, size: number = 20): Observable<ReservaAuditoria[]> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio.toISOString())
      .set('fechaFin', fechaFin.toISOString())
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<ReservaAuditoria[]>(`${this.apiUrl}/fechas`, { params });
  }

  registrarAccion(
    reservaUuid: string,
    accion: string,
    usuarioUuid: string,
    estadoAnterior?: string,
    estadoNuevo?: string,
    datosCambio?: string,
    observaciones?: string,
    direccionIp?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('reservaUuid', reservaUuid)
      .set('accion', accion)
      .set('usuarioUuid', usuarioUuid);
    
    if (estadoAnterior) params = params.set('estadoAnterior', estadoAnterior);
    if (estadoNuevo) params = params.set('estadoNuevo', estadoNuevo);
    if (datosCambio) params = params.set('datosCambio', datosCambio);
    if (observaciones) params = params.set('observaciones', observaciones);
    if (direccionIp) params = params.set('direccionIp', direccionIp);
    
    return this.http.post(`${this.apiUrl}/registrar`, null, { params });
  }

  getEstadisticasPorAccion(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/estadisticas/accion`);
  }

  countByReserva(reservaUuid: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/contador/reserva/${reservaUuid}`);
  }
}