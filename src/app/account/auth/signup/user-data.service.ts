// user-data.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserDataService {
  private temporaryUserData: any = null;

  setTemporaryUserData(data: any) {
    this.temporaryUserData = data;
  }

  getTemporaryUserData() {
    const data = this.temporaryUserData;
    this.temporaryUserData = null; // Clear data after retrieval
    return data;
  }
}