import { Injectable } from '@angular/core';

import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
// import { AdjuntoReclamo } from '../../models/adjunto-reclamo.models';
@Injectable({
  providedIn: 'root'
})
export class AdjuntoReclamoService {
    apiUrl = environment.backendUrl + '/adjunto-reclamo';


  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/adjuntoreclamos`);
  }

  getByUuid(uuid:String):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}/uuid/${uuid}`);
  }
  save(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, data);
  }

createAdjunto(adjuntoReclamoDto: any, file: File): Observable<any> {
    let params = new HttpParams()
      .set('uuidReclamo', adjuntoReclamoDto.reclamoDto.uuid)
      .set('fechaIngreso', '' + adjuntoReclamoDto.fechaIngreso)

  const formData: FormData = new FormData();
  formData.append('archivoFile', file);
  formData.append('adjuntoReclamoDto', JSON.stringify(adjuntoReclamoDto));

    return this.http.post<any>(`${this.apiUrl}/create-anterior`, formData, { params });
}


  createAdjuntoReclamo(adjuntoReclamoDto: any, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('adjuntoReclamoDto', JSON.stringify(adjuntoReclamoDto));
    formData.append('archivoFile', file, file.name);

    return this.http.post<any>(`${this.apiUrl}/create`, formData,{
      headers: new HttpHeaders({
        'Content-Type': 'multipart/form-data'
      })
    });
  }


  update(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, data);
  }
  delete(uuid: string) {
    return this.http.delete(`${this.apiUrl}/delete/${uuid}`);
  }
  getAdjuntosByUuidReclamo(uuid:String):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}/por-uuidreclamo/${uuid}`);
  }
  // descargarArchivo(nombre:string): Observable <any>{
  //   return this.http.get<any>(`${this.apiUrl}/descargar/${nombre}`,{
  //     responseType: 'arraybuffer' as 'json'
  //     });
  // }
  descargarArchivo(nombre: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/descargar/${nombre}`, {
      responseType: 'blob'
    });
  }
  
}
