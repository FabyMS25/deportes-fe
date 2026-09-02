import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { logout, logoutSuccess } from 'src/app/store/Authentication/authentication.actions';
import { TokenStorageService } from './token-storage.service';

import { UserRol } from 'src/app/core/constants/UserData';
import { firstValueFrom, of, Subject, timeout } from 'rxjs';
import { SystemConfigurationService } from './api/system-configuration.service';
import { ConfiguracionSistema } from '../models/configuracionSistema.model';
import { AplicaAConfiguracion, CategoriaConfiguracion } from '../constants/Configurations';
import { RuatRequestsService } from './ruatRequest.service';
import { MenuItem } from '../models/menu.model';
import { MENU_BASE } from '../constants/menu';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';

interface DeportesLoginResponse {
  token: string;
  user: any;
  menu: MenuItem[];
  staff: any;
  admin: boolean;
  userType: 'STAFF' | 'TAXPAYER';
}

export interface LoginResult {
  success: boolean;
  errorType?: 'BAD_CREDENTIALS' |'NO_MODULE' | 'NO_PERMISSIONS' | 'NO_ASSIGNATION'|'BACKEND' | 'CONFIG_ERROR';
  message?: string;
  redirect?: string;
  ruatStatus?: boolean;
  restrictions?: string;
}
export interface LoginEvent {
  message: 'welcome_admin' | 'welcome_staff' | 'welcome_contribuyente' | 'login_success';
  configsLoaded?: number;
  ruatStatus?: boolean;
}
export interface RuatAvailabilityResult {
  available: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  userRole!: 'Contribuyente' | 'Admin' | 'Encargado';
  private currentUserSubject: any;
  private loginEventSubject = new Subject<LoginEvent>();
  private pendingLoginEvent: LoginEvent | null = null;
  loginEvent$ = this.loginEventSubject.asObservable();
  private systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  private readonly ruatLoginTimeoutMs = 8000;
  private expirationTimer: ReturnType<typeof setTimeout> | null = null;
  private expirationNoticeOpen = false;
  public systemStatus = {
    backend: false,
    configurations: false,
    ruat: false,
    message: ''
  };

  constructor(
    private http: HttpClient, 
    private router: Router,
    private systemConfigsService: SystemConfigurationService,
    private ruatService: RuatRequestsService,
    private storageService: TokenStorageService,
  ) {
    this.currentUserSubject = storageService.getUser()
    this.systemConfigList = this.storageService.getConfigs() || {};
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
      const menu = this.sortMenuItemsRecursive(taxpayer ? MENU_BASE : loginResponse.menu);
      const configResult = await this.loadSystemConfigs(taxpayer, loginResponse.token);
      if (!configResult.configsStatus) {
        this.storageService.signOut();
        return {
          success: false,
          errorType: 'CONFIG_ERROR',
          message: configResult.errorMessage
        };
      }
      this.storageService.saveAuthData({
        menu,
        configs: configResult.configs || {},
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
        ruatStatus: configResult.ruatStatus
      });
      return {
        success: true,
        redirect: taxpayer ? '/inicio/taxpayer' : loginResponse.admin ? '/inicio' : '/inicio/employee'
      };
    } catch (error: any) {
      const code = error?.error?.code;
      return {
        success: false,
        errorType: code || (error?.status === 0 ? 'BACKEND' : 'BAD_CREDENTIALS'),
        message: error?.error?.message || 'Usuario o contraseña incorrectos'
      };
    }
  }
  public async loadSystemConfigs(
    isContribuyente: boolean,
    token?: string
  ): Promise<{
    configsStatus: boolean;
    configs?: { [key: string]: ConfiguracionSistema };
    ruatStatus: boolean;
    errorType?: 'BACKEND' | 'CORS' | 'INVALID_RESPONSE' | 'RUAT' | 'UNKNOWN';
    errorMessage?: string;
  }> {    
    this.systemStatus = {
      backend: false,
      configurations: false,
      ruat: false,
      message: ''
    };
    try {
      const configResponse = await firstValueFrom(
        this.systemConfigsService.getAll(token)
      );
      if (!configResponse) {
        this.systemStatus.message = 'No response from backend';
        return {
          configsStatus: false,
          ruatStatus: false,
          errorType: 'BACKEND',
          errorMessage: this.systemStatus.message
        };
      }
      if (!Array.isArray(configResponse)) {
        this.systemStatus.message = 'Invalid configuration response';
        return {
          configsStatus: false,
          ruatStatus: false,
          errorType: 'INVALID_RESPONSE',
          errorMessage: this.systemStatus.message
        };
      }
      const configsMap = this.resolveAudienceConfigurations(configResponse, isContribuyente);
      this.systemConfigList = configsMap;
      this.systemStatus.backend = true;
      this.systemStatus.configurations = true;
      const ruatResult = await this.checkRuatAvailability();
      this.systemStatus.ruat = ruatResult.success;
      if (!ruatResult.success) {
        this.systemStatus.message = 'RUAT authentication failed';
      }
      return {
        configsStatus: true,
        configs: configsMap,
        ruatStatus: ruatResult.success,
        errorType: ruatResult.success ? undefined : 'RUAT',
        errorMessage: ruatResult.error
      };
    } catch (error: any) {
      if (error?.status === 0) {
        this.systemStatus.message = 'Backend unreachable or CORS blocked';
        return {
          configsStatus: false,
          ruatStatus: false,
          errorType: 'CORS',
          errorMessage: this.systemStatus.message
        };
      }
      this.systemStatus.message = error?.message || 'Unknown error';
      return {
        configsStatus: false,
        ruatStatus: false,
        errorType: 'UNKNOWN',
        errorMessage: this.systemStatus.message
      };
    }
  }

  /**
   * Resolves only audience-level settings during login. Entity scopes need the
   * selected reservation context and must never overwrite a global setting here.
   */
  private resolveAudienceConfigurations(
    configs: ConfiguracionSistema[],
    isContribuyente: boolean
  ): { [key: string]: ConfiguracionSistema } {
    const resolved: { [key: string]: ConfiguracionSistema } = {};
    const priority = (config: ConfiguracionSistema): number => {
      if (isContribuyente && config.aplicaA === AplicaAConfiguracion.CONTRIBUYENTE) return 2;
      if (!config.aplicaA || config.aplicaA === AplicaAConfiguracion.GLOBAL) return 1;
      return 0;
    };

    configs
      .filter(config => config.activo === true && config.categoria !== CategoriaConfiguracion.RUAT)
      .filter(config => priority(config) > 0)
      .sort((a, b) => priority(a) - priority(b))
      .forEach(config => {
        resolved[config.clave] = config;
      });

    return resolved;
  }

  private async checkRuatAvailability(): Promise<{ success: boolean; error?: any }> {
    try {
      const response: any = await firstValueFrom(
        this.ruatService.authenticate().pipe(timeout(this.ruatLoginTimeoutMs))
      );
      return { success: response?.available === true };
    } catch (error) {
      return { success: false, error };
    }
  }

  async ensureRuatAuthenticated(forceRefresh: boolean = false): Promise<RuatAvailabilityResult> {
    if (!forceRefresh && this.systemStatus.ruat) {
      return { available: true };
    }
    const ruatResult = await this.checkRuatAvailability();
    this.systemStatus.ruat = ruatResult.success;

    if (ruatResult.success) {
      return { available: true };
    }

    return {
      available: false,
      message: 'RUAT no está disponible. Vuelva a intentar en unos minutos.'
    };
  }
  
  private isBackendError(error: any): boolean {
    return (
      error.status === 0 ||
      error.status === 504 ||
      error.status === 502 ||
      error.name === 'HttpErrorResponse' ||
      (error.error && error.error instanceof ProgressEvent) ||
      error.message?.includes('CORS') ||
      error.message?.includes('Network') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Http failure')
    );
  }

  /*
   * Logout the user
   */
  logout() {
    if (this.expirationTimer) clearTimeout(this.expirationTimer);
    this.storageService.signOut();
    this.currentUserSubject = null;
    this.router.navigate(['/auth/login']);
    return of(undefined).pipe();
  }

  /**
   * GETTERS
   */
  hasPermission(modulo: string): string[] {
    const menu = this.storageService.getMenu();
    return menu
      .filter(permission => permission.nombreMenu === modulo)
      .map(permission => permission.accion) as string[];
  }
  hasRoutePermission(route: string): boolean {
    const menu = this.storageService.getMenu();
    return menu.some(permission => permission.ruta === route);
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

  isRuatAuthenticated(): boolean {
    return this.systemStatus.ruat;
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
  getUserRole(): 'Contribuyente' | 'Admin' | 'Encargado' {
    if (this.isTaxpayer()) {
      return 'Contribuyente';
    } else { 
      if (this.isAdmin()) {
        return 'Admin';
      }
      return 'Encargado';
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
      role = UserRol.find(item => item.tipo == 2);//CLIENT
    }else if (this.isAdmin()) {
      role = UserRol.find(item => item.tipo === 0);//ADMINISTRADOR
    } else {
      role = UserRol.find(item => item.tipo == 1);//STAFF
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
      return 'No puede realizar nuevas reservas mientras su cuenta esté sancionada.';
    }
    if (user?.estadoUsuario === 'BLOQUEADO') {
      return 'No puede realizar nuevas reservas mientras su cuenta esté bloqueada.';
    }
    if (user?.estadoUsuario === 'PENDIENTE_VERIFICACION') {
      return 'Debe completar la verificación de su cuenta antes de realizar reservas.';
    }
    return 'Su cuenta debe estar activa para realizar nuevas reservas.';
  }

  async handleExpiredSession(): Promise<void> {
    if (this.expirationNoticeOpen || !this.isLoggedIn()) return;
    this.expirationNoticeOpen = true;
    await Swal.fire({
      icon: 'warning',
      title: 'Sesión expirada',
      text: 'Su sesión ha expirado. Inicie sesión nuevamente para continuar.',
      confirmButtonText: 'Ir al inicio de sesión',
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
    const actionOrder = ['LISTAR','VER', 'CREAR', 'EDITAR', 'ACTUALIZAR', 'VALIDAR', 'ANULAR', 'GENERAR TICKET', 'CAMBIAR-HORARIO', 'EXPORTAR', 'BLOQUEAR', 'ELIMINAR'];
    const index = actionOrder.indexOf(accion);
    return index !== -1 ? index : actionOrder.length;
  }

}
