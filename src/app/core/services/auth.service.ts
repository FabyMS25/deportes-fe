import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { logout, logoutSuccess } from 'src/app/store/Authentication/authentication.actions';
import { TokenStorageService } from './token-storage.service';

import { UserRole, UserRoleName, UserRoles } from 'src/app/core/constants/UserData';
import { firstValueFrom, of, Subject } from 'rxjs';
import { ConfiguracionSistema } from '../models/configuracionSistema.model';
import { MenuItem } from '../models/menu.model';
import { permissionActions, hasMenuRoute, resolveMenuRoute } from '../helpers/menu-permissions';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';

const PERMISSION_VERSION = 3;
const CLIENT_CONFIGURATION_CATEGORIES = new Set([
  'DATOS_REFERENCIA', 'REGLAS_RESERVA', 'POLITICAS_PAGO', 'LIMITES', 'TIMEOUTS'
]);

interface DeportesLoginResponse {
  token: string;
  user: any;
  menu: MenuItem[];
  staff: any;
  admin: boolean;
  userType: 'STAFF' | 'TAXPAYER';
  configurations: ConfiguracionSistema[];
  ruatStatus: boolean;
  ruatMessage: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  redirect?: string;
  restrictions?: string;
}
export interface LoginEvent {
  message: 'welcome_admin' | 'welcome_staff' | 'welcome_contribuyente' | 'login_success';
  configsLoaded?: number;
  ruatStatus?: boolean;
  ruatMessage?: string;
}
@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  userRole!: 'Contribuyente' | 'Admin' | 'Encargado';
  private currentUserSubject: any;
  private loginEventSubject = new Subject<LoginEvent>();
  private pendingLoginEvent: LoginEvent | null = null;
  loginEvent$ = this.loginEventSubject.asObservable();
  private systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  private expirationTimer: ReturnType<typeof setTimeout> | null = null;
  private expirationNoticeOpen = false;
  public systemStatus = {
    backend: false,
    configurations: false,
    message: ''
  };

  constructor(
    private translate: TranslateService,
    private http: HttpClient, 
    private router: Router,
    private storageService: TokenStorageService,
  ) {
    this.currentUserSubject = storageService.getUser()
    this.systemConfigList = this.sanitizeClientConfigurations(
      Object.values(this.storageService.getConfigs() || {})
    );
    // Removes PERMISSIONS/NOTIFICACIONES/RUAT values left by an older session.
    this.storageService.saveConfigs(this.systemConfigList);
    this.scheduleExpiration();
  }

  initializeSession(){

  }
  emitLoginEvent(event: LoginEvent) {
    this.pendingLoginEvent = event;
    this.loginEventSubject.next(event);
  }

  consumeLoginEvent(): LoginEvent | null {
    const event = this.pendingLoginEvent;
    this.pendingLoginEvent = null;
    return event;
  }

  async login(username: string, password: string, rememberMe: boolean): Promise<LoginResult> {
    try {
      const loginResponse = await firstValueFrom(this.http.post<DeportesLoginResponse>(
        `${environment.backendUrl}/auth/login`, { username, password }
      ));
      const taxpayer = loginResponse.userType === 'TAXPAYER';
      const user = {
        ...loginResponse.user,
        userType: loginResponse.userType,
        admin: loginResponse.admin
      };
      const menu = this.sortMenuItemsRecursive(loginResponse.menu || []);
      const configs = this.mapLoginConfigurations(loginResponse.configurations || []);
      this.storageService.saveAuthData({
        menu,
        configs,
        user,
        staff: loginResponse.staff,
        token: loginResponse.token
      });
      this.currentUserSubject = user;
      this.scheduleExpiration();
      this.storageService.saveRememberedLogin(username, rememberMe);
      this.emitLoginEvent({
        message: taxpayer ? 'welcome_contribuyente' : loginResponse.admin ? 'welcome_admin' : 'welcome_staff',
        configsLoaded: Object.keys(this.getAllConfigs() || {}).length,
        ruatStatus: loginResponse.ruatStatus,
        ruatMessage: loginResponse.ruatMessage,
      });
      return {
        success: true,
        redirect: taxpayer ? '/inicio/taxpayer' : loginResponse.admin ? '/inicio' : '/inicio/employee'
      };
    } catch (error: any) {
      const response = error?.error;
      const responseMessage = typeof response === 'string' ? response : response?.message;
      const translatedByCode: Record<string, string> = {
        BAD_CREDENTIALS: 'LOGIN_UI.BAD_CREDENTIALS',
        NO_MODULE: 'LOGIN_UI.NO_MODULE',
        NO_PERMISSIONS: 'LOGIN_UI.NO_PERMISSIONS',
        NO_ASSIGNATION: 'LOGIN_UI.NO_ASSIGNATION',
        ACCOUNT_DISABLED: 'LOGIN_UI.ACCOUNT_DISABLED',
        USUARIOS_UNAVAILABLE: 'LOGIN_UI.USUARIOS_UNAVAILABLE',
        CONTRIBUYENTES_UNAVAILABLE: 'LOGIN_UI.CONTRIBUYENTES_UNAVAILABLE'
      };
      const codeMessage = response?.code ? translatedByCode[response.code] : undefined;
      return {
        success: false,
        message: codeMessage
          ? this.translate.instant(codeMessage)
          : responseMessage || this.translate.instant(
          error?.status === 0 ? 'LOGIN_UI.UNAVAILABLE' : 'LOGIN_UI.FAILED'
        )
      };
    }
  }
  /**
   * Authentication already contains a server-filtered configuration snapshot.
   * In particular, PERMISSIONS are represented exclusively by the menu and
   * never stored in the browser's configuration map.
   */
  private mapLoginConfigurations(configurations: ConfiguracionSistema[]): { [key: string]: ConfiguracionSistema } {
    this.systemStatus = {
      backend: true,
      configurations: true,
      message: ''
    };
    const resolved = this.sanitizeClientConfigurations(configurations);
    this.systemConfigList = resolved;
    return resolved;
  }

  private sanitizeClientConfigurations(configurations: ConfiguracionSistema[]): { [key: string]: ConfiguracionSistema } {
    const resolved: { [key: string]: ConfiguracionSistema } = {};
    (Array.isArray(configurations) ? configurations : [])
      // Defense in depth: a stale/misconfigured API response cannot put
      // permissions, notifications or RUAT data into browser storage.
      .filter(config => config.activo === true && CLIENT_CONFIGURATION_CATEGORIES.has(config.categoria))
      .forEach(config => {
        resolved[config.clave] = config;
      });
    return resolved;
  }

  /*
   * Logout the user
   */
  logout() {
    if (this.expirationTimer) clearTimeout(this.expirationTimer);
    if (this.storageService.getToken()) {
      this.http.post(`${environment.backendUrl}/auth/logout`, {}).subscribe({ error: () => undefined });
    }
    this.storageService.signOut();
    this.currentUserSubject = null;
    this.router.navigate(['/auth/login']);
    return of(undefined).pipe();
  }

  /**
   * GETTERS
   */
  hasPermission(resourceRoute: string): string[] {
    return permissionActions(this.storageService.getMenu(), resourceRoute);
  }
  hasRoutePermission(route: string): boolean {
    return hasMenuRoute(this.storageService.getMenu(), route);
  }
  /** Single route-access check: the longest menu route that covers the URL. */
  canAccessRoute(url: string): boolean {
    return !!resolveMenuRoute(this.storageService.getMenu(), url);
  }

  public tokenUser(): any {
    return this.storageService.getToken();
  }
  public currentUser(): any {
    return this.currentUserSubject;
  }
  public staff(): any {
    return this.storageService.getStaff();
  }
  public isLoggedIn(): boolean {
    const token = this.storageService.getToken();
    return !!token;
  }
  get isAuthenticated(): boolean {
    return !!this.storageService.getToken();
  }

  getSystemConfig(clave: string): ConfiguracionSistema | undefined {
    return this.systemConfigList[clave];
  }
  getAllConfigs(): { [key: string]: ConfiguracionSistema } {
    return this.storageService.getConfigs();
  }


  isAdmin(): boolean {
    return this.storageService.getUser()?.admin === true;
  }
  getUserRole(): UserRoleName {
    if (this.isTaxpayer()) {
      return UserRoles.CONTRIBUYENTE;
    } else { 
      if (this.isAdmin()) {
        return UserRoles.ADMIN;
      }
      return UserRoles.ENCARGADO;
    }
  }
  getDashboardRoute(): string {
    const role = this.getUserRole();
    if (role === 'Contribuyente') return '/inicio/taxpayer';
    if (role === 'Encargado') return '/inicio/employee';
    return '/inicio';
  }
  getUserFullName(): string {
    if (!this.currentUserSubject) return '';    
    if (this.isTaxpayer()) {
      return this.currentUserSubject.nombreCompleto || 
             (this.currentUserSubject.nombre + ' ' + this.currentUserSubject.primerApellido + 
              (this.currentUserSubject.segundoApellido ? ' ' + this.currentUserSubject.segundoApellido : '')) || 
             this.currentUserSubject.userName || 
             'Contribuyente';
    } else {
      return this.currentUserSubject.designacion?.personaDto?.fullName || 
             (this.currentUserSubject.designacion?.personaDto?.nombre + ' ' + 
              this.currentUserSubject.designacion?.personaDto?.apPaterno) || 
             this.currentUserSubject.username || 
             'Usuario';
    }
  }
  
  public getAvatar(): string{    
    const user =  this.storageService.getUser(); 
    let avatar="default-profile1.png";
    let role;
    if(this.isTaxpayer()){
      role = UserRole.find(item => item.tipo == 2);//CLIENT
    }else if (this.isAdmin()) {
      role = UserRole.find(item => item.tipo === 0);//ADMINISTRADOR
    } else {
      role = UserRole.find(item => item.tipo == 1);//STAFF
    }
    if (role !== undefined) {
      avatar = role.avatarF;
      const gender = this.isTaxpayer()
        ? (user as any)?.genero
        : user?.designacion?.personaDto?.sexo;
      if (String(gender || '').toUpperCase() === 'M') {
        avatar = role.avatarM;
      }
    }  
    return avatar
  }

  isTaxpayer(): boolean {
    return this.storageService.getUser()?.userType === 'TAXPAYER';
  }

  canCurrentUserCreateReservations(): boolean {
    if (!this.isTaxpayer()) {
      return true;
    }

    const user: any = this.storageService.getUser() ?? this.currentUserSubject;
    return user?.estadoUsuario === 'ACTIVO' && user?.estaSancionado !== true;
  }

  getReservationRestrictionMessage(): string {
    const user: any = this.storageService.getUser() ?? this.currentUserSubject;
    if (user?.estaSancionado === true || user?.estadoUsuario === 'SANCIONADO') {
      return this.translate.instant('LOGIN_UI.SANCTIONED');
    }
    if (user?.estadoUsuario === 'BLOQUEADO') {
      return this.translate.instant('LOGIN_UI.BLOCKED');
    }
    if (user?.estadoUsuario === 'PENDIENTE_VERIFICACION') {
      return this.translate.instant('LOGIN_UI.VERIFY_ACCOUNT');
    }
    return this.translate.instant('LOGIN_UI.INACTIVE');
  }

  async handleExpiredSession(): Promise<void> {
    if (this.expirationNoticeOpen || !this.isLoggedIn()) return;
    this.expirationNoticeOpen = true;
    await Swal.fire({
      icon: 'warning',
      title: this.translate.instant('LOGIN_UI.SESSION_EXPIRED'),
      text: this.translate.instant('LOGIN_UI.SESSION_EXPIRED_BODY'),
      confirmButtonText: this.translate.instant('LOGIN_UI.SIGN_IN'),
      allowOutsideClick: false
    });
    this.expirationNoticeOpen = false;
    this.logout();
  }

  private scheduleExpiration(): void {
    if (this.expirationTimer) clearTimeout(this.expirationTimer);
    const token = this.storageService.getToken();
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.permissionVersion !== PERMISSION_VERSION) {
        void this.handleExpiredSession();
        return;
      }
      const delay = payload.exp * 1000 - Date.now();
      if (delay <= 0) {
        void this.handleExpiredSession();
        return;
      }
      this.expirationTimer = setTimeout(() => void this.handleExpiredSession(), Math.min(delay, 2147483647));
    } catch {
      void this.handleExpiredSession();
    }
  }

  private sortMenuItemsRecursive(menuItems: MenuItem[]): MenuItem[] {
    return menuItems.map(item => {
      if (item.permisoHijoListDto && item.permisoHijoListDto.length > 0) {
        return {
          ...item,
          permisoHijoListDto: this.sortMenuItems(item.permisoHijoListDto)
        };
      }
      return item;
    }).sort((a, b) => {
      const orderCompare = (a.orden || 0) - (b.orden || 0);
      if (orderCompare !== 0) return orderCompare;
      const aPriority = this.getActionPriority(a.accion);
      const bPriority = this.getActionPriority(b.accion);
      return aPriority - bPriority;
    });
  }

  private sortMenuItems(menuItems: MenuItem[]): any[] {
    return menuItems.sort((a, b) => {
      const orderCompare = (a.orden || 0) - (b.orden || 0);
      if (orderCompare !== 0) return orderCompare;
      const aPriority = this.getActionPriority(a.accion);
      const bPriority = this.getActionPriority(b.accion);
      return aPriority - bPriority;
    });
  }
  private getActionPriority(accion: any): number {
    const actionOrder = ['LISTAR','VER', 'CREAR', 'ACTUALIZAR', 'VALIDAR', 'ANULAR', 'GENERAR TICKET', 'CAMBIAR-HORARIO', 'EXPORTAR', 'BLOQUEAR'];
    const index = actionOrder.indexOf(accion);
    return index !== -1 ? index : actionOrder.length;
  }

}
