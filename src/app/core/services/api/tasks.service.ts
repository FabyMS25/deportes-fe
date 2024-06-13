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

export class TasksService {
  private readonly URL = `${environment.apitaskboard}/tarea`;

  constructor(private http: HttpClient) { }

  public getTaskSummaryByUuid(taskUuid: string): Observable<Task> {
    let params = new HttpParams();
    params = params.append('uuidtarea', taskUuid);
    return this.http.get<Task>(`${this.URL}/seguimiento-tarea`, { params })
      .pipe(map((data: any) => data.payload));
  }
}
