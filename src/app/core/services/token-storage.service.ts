import { Injectable } from '@angular/core';
import { GlobalComponent } from 'src/app/global-component';
import { LoginResponse } from '../models/user/login-response.model';
import { MenuItem } from '../models/menu.model';
import { ConfiguracionSistema } from '../models/configuracionSistema.model';

const STORAGE_KEYS = GlobalComponent.STORAGE_KEYS;
@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  constructor() { }
  
  public saveAuthData(data: {
    menu: MenuItem[];
    configs: { [key: string]: ConfiguracionSistema } ,
    user: any;
    staff?: any;
    token: string;
    ruatToken?: string;
  }, rememberMe: boolean = false): void {

    sessionStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
    sessionStorage.setItem(STORAGE_KEYS.RUAT_TOKEN, data.ruatToken ?? '');    
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(data.configs));
      localStorage.setItem(STORAGE_KEYS.MENU, 
        typeof data.menu === 'string' ? data.menu : JSON.stringify(data.menu));
      localStorage.setItem(STORAGE_KEYS.USER, 
        typeof data.user === 'string' ? data.user : JSON.stringify(data.user));
      if (data.staff) {
        localStorage.setItem(STORAGE_KEYS.STAFF, 
          typeof data.staff === 'string' ? data.staff : JSON.stringify(data.staff));
      }
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.CONFIGS);
      localStorage.removeItem(STORAGE_KEYS.MENU);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.STAFF);
      sessionStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(data.configs));
      sessionStorage.setItem(STORAGE_KEYS.MENU,
        typeof data.menu === 'string' ? data.menu : JSON.stringify(data.menu));
      sessionStorage.setItem(STORAGE_KEYS.USER, 
        typeof data.user === 'string' ? data.user : JSON.stringify(data.user));
      if (data.staff) {
        sessionStorage.setItem(STORAGE_KEYS.STAFF, 
          typeof data.staff === 'string' ? data.staff : JSON.stringify(data.staff)
        );
      }
    }
  }

  signOut(): void {
    sessionStorage.clear();
    if(!this.isRememberMe()){
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.STAFF);
      localStorage.removeItem(STORAGE_KEYS.MENU);
      localStorage.removeItem(STORAGE_KEYS.CONFIGS);
    }
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
  }

  private get primaryStorage(): Storage {
    return this.isRememberMe() ? localStorage : sessionStorage;
  }

  /**
   * setters 
   */
  public saveUserData(user: LoginResponse): void {
    this.primaryStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }
  public saveToken(token: string): void {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
  }
  public saveRuatToken(token: string): void {
    sessionStorage.setItem(STORAGE_KEYS.RUAT_TOKEN, token);
  }
  
  /**
   * Getters
   */
  public getToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.TOKEN);
  }
  public getTokenRuat(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.RUAT_TOKEN);
  }
  public isRememberMe(): boolean {
    return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
  }
  public getMenu(): MenuItem[] {
    return this.read(STORAGE_KEYS.MENU) ?? [];
  }
  public getConfigs(): { [key: string]: ConfiguracionSistema } {
    return this.read(STORAGE_KEYS.CONFIGS) ?? {};
  }
  public getUser(): LoginResponse | null {
    return this.read(STORAGE_KEYS.USER);
  }
  public getStaff(): any {
    return this.read(STORAGE_KEYS.STAFF);
  }
  public isAuthenticated(): boolean {
    return !!this.getToken();
  }
  public hasStaffAssignments(): boolean {
    return !!this.getStaff();
  }

  // private read(key: string): any {
  //   const fromSession = sessionStorage.getItem(key);
  //   if (fromSession) return this.parse(fromSession);
  //   const fromLocal = localStorage.getItem(key);
  //   if (fromLocal) return this.parse(fromLocal);
  //   return null;
  // }
  // private parse(value: string): any {
  //   try { return JSON.parse(value); } catch { return value; }
  // }
  private read(key: string): any {
    return this.getFrom(sessionStorage, key) ??
          this.getFrom(localStorage, key);
  }
  private getFrom(storage: Storage, key: string): any {
    const item = storage.getItem(key);
    if (!item) return null;
    try { return JSON.parse(item); } catch { return item; }
  }

}
