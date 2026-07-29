import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReservaAuditoria } from '../../models/reservaAuditoria.model';
import { apiGet, apiPost } from '../apiResponses';

@Injectable({
  providedIn: 'root'
})
export class ReservaAuditoriaService {
  apiUrl = environment.backendUrl + '/reservas-auditorias';

  constructor(private http: HttpClient) { }

  getByUuid(uuid: string): Observable<ReservaAuditoria> {
    return apiGet<ReservaAuditoria>(this.http, `${this.apiUrl}/${uuid}`, `obtener auditoría de reserva (${uuid})`);
  }

  getByReservaUuid(reservaUuid: string, page: number = 0, size: number = 20): Observable<ReservaAuditoria[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return apiGet<ReservaAuditoria[]>(this.http, `${this.apiUrl}/reserva/${reservaUuid}`, `obtener auditorías por reserva (${reservaUuid})`, { params });
  }

  getUltimasByReserva(reservaUuid: string, limite: number = 10): Observable<ReservaAuditoria[]> {
    let params = new HttpParams().set('limite', limite.toString());
    return apiGet<ReservaAuditoria[]>(this.http, `${this.apiUrl}/reserva/${reservaUuid}/ultimas`, `obtener últimas auditorías (${reservaUuid})`, { params });
  }

  getByAccion(accion: string): Observable<ReservaAuditoria[]> {
    return apiGet<ReservaAuditoria[]>(this.http, `${this.apiUrl}/accion/${accion}`, `obtener auditorías por acción (${accion})`);
  }

  getByFecha(fechaInicio: Date, fechaFin: Date, page: number = 0, size: number = 20): Observable<ReservaAuditoria[]> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio.toISOString())
      .set('fechaFin', fechaFin.toISOString())
      .set('page', page.toString())
      .set('size', size.toString());
    
    return apiGet<ReservaAuditoria[]>(this.http, `${this.apiUrl}/fechas`, 'obtener auditorías por fecha', { params });
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
    
    return apiPost<any>(this.http, `${this.apiUrl}/registrar`, null, 'registrar auditoría de reserva', { params });
  }

  getEstadisticasPorAccion(): Observable<any[]> {
    return apiGet<any[]>(this.http, `${this.apiUrl}/estadisticas/accion`, 'obtener estadísticas de auditoría por acción');
  }

  countByReserva(reservaUuid: string): Observable<number> {
    return apiGet<number>(this.http, `${this.apiUrl}/contador/reserva/${reservaUuid}`, `contar auditorías por reserva (${reservaUuid})`);
  }
}
