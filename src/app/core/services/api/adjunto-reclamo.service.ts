import { Injectable } from '@angular/core';

import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { apiDelete, apiGet, apiPost, apiPut } from '../apiResponses';
// import { AdjuntoReclamo } from '../../models/adjunto-reclamo.models';
@Injectable({
  providedIn: 'root'
})
export class AdjuntoReclamoService {
    apiUrl = environment.backendUrl + '/adjunto-reclamo';


  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return apiGet<any[]>(this.http, `${this.apiUrl}/adjuntoreclamos`, 'obtener adjuntos de reclamo');
  }

  getByUuid(uuid:String):Observable<any>{
    return apiGet<any>(this.http, `${this.apiUrl}/uuid/${uuid}`, `obtener adjunto de reclamo (${uuid})`);
  }
  save(data: any): Observable<any> {
    return apiPost<any>(this.http, `${this.apiUrl}/create`, data, 'guardar adjunto de reclamo');
  }

createAdjunto(adjuntoReclamoDto: any, file: File): Observable<any> {
    let params = new HttpParams()
      .set('uuidReclamo', adjuntoReclamoDto.reclamoDto.uuid)
      .set('fechaIngreso', '' + adjuntoReclamoDto.fechaIngreso)

  const formData: FormData = new FormData();
  formData.append('archivoFile', file);
  formData.append('adjuntoReclamoDto', JSON.stringify(adjuntoReclamoDto));

    return apiPost<any>(this.http, `${this.apiUrl}/create-anterior`, formData, 'crear adjunto de reclamo anterior', { params });
}


  createAdjuntoReclamo(adjuntoReclamoDto: any, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('adjuntoReclamoDto', JSON.stringify(adjuntoReclamoDto));
    formData.append('archivoFile', file, file.name);

    return apiPost<any>(this.http, `${this.apiUrl}/create`, formData, 'crear adjunto de reclamo', {
      headers: new HttpHeaders({
        'Content-Type': 'multipart/form-data'
      })
    });
  }


  update(data: any): Observable<any> {
    return apiPut<any>(this.http, `${this.apiUrl}/update`, data, 'actualizar adjunto de reclamo');
  }
  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/delete/${uuid}`, `anular adjunto de reclamo (${uuid})`);
  }
  getAdjuntosByUuidReclamo(uuid:String):Observable<any>{
    return apiGet<any>(this.http, `${this.apiUrl}/por-uuidreclamo/${uuid}`, `obtener adjuntos por reclamo (${uuid})`);
  }
  // descargarArchivo(nombre:string): Observable <any>{
  //   return this.http.get<any>(`${this.apiUrl}/descargar/${nombre}`,{
  //     responseType: 'arraybuffer' as 'json'
  //     });
  // }
  descargarArchivo(nombre: string): Observable<Blob> {
    return apiGet<Blob>(this.http, `${this.apiUrl}/descargar/${nombre}`, `descargar adjunto (${nombre})`, {
      responseType: 'blob'
    });
  }
  
}
