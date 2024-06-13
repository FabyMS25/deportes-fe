/**Core */
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

/**Enviroments */
import { environment } from 'src/environments/environment';

/**Models */
import { Task } from '../../models/task.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})

export class TasksBoardUnidadesService {
  private readonly URL = `${environment.apitaskboard}`;

  constructor(private http: HttpClient) { }

  public getAllUnits(): Observable<Task> {
    return this.http.get<any>(`${this.URL}/unidad/unidades`)
  }
}
