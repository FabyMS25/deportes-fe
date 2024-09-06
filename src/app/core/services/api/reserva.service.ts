import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Reserva } from '../../models/reserva.models';
import { Observable } from 'rxjs';


import { GlobalComponent } from "../../../global-component";
// GlobalComponent.API_URL + GlobalComponent.product,
@Injectable({
  providedIn: 'root'
})

export class ReservaService {
  apiUrl = environment.backendUrl + '/reservas';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}`);
  }

  getAllbyFechas(desde:Date, hasta:Date): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/por-fechareserva?fechaIni=${desde}&fechaFin=${hasta}`);
  }

  getByUuid(uuid: String): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.apiUrl}${uuid}`);
  }
  getByField(uuid: String): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.apiUrl}/cancha/${uuid}`);
  }

  // getClaimByCode(code: String): Observable<Reserva> {
  //   return this.http.get<Reserva>(`${this.apiUrl}/codigo/${code}`).pipe(map((data: any) => data.payload));
  // }
  save(data: any): Observable<any> {
    return this.http.post<Reserva>(`${this.apiUrl}`, data);
  }

  update(data: Reserva): Observable<Reserva> {
    return this.http.put<Reserva>(`${this.apiUrl}`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/${uuid}`);
  }

  // showReport(uuid:string): Observable<any>{
  //   return this.http.get<any>(`${this.apiUrl}/nota-solicitud-reclamo?rUuid=${uuid}`,{
  //           responseType: 'arraybuffer' as 'json'
  //   });
  // }
  // getTotal(uuid:string):Observable<any>{
  //   return this.http.get<any>(`${this.apiUrl}/total-porunidad?uuidunidad=${uuid}`);
  // }
  // getTotalByState(uuid:string,estado:number):Observable<any>{
  //   return this.http.get<any>(`${this.apiUrl}/cantidad-porestado?uuidunidad=${uuid}&estadoreclamo=${estado}`);
  // }
  // getTotalAtendidos(uuid:string):Observable<any>{
  //   return this.http.get<any>(`${this.apiUrl}/cantidad-atendidos?uuidunidad=${uuid}`);
  // }

}
