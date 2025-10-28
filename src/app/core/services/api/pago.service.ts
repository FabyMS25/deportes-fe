import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

import { Pago } from '../../models/pago.model';

@Injectable({
  providedIn: 'root'
})

export class PagoService {
  apiUrl = environment.backendUrl + '/pagos';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  getByUuid(uuid: String): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}${uuid}`);
  }

  save(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  update(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}`, data);
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
