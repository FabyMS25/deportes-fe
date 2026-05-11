import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { logout, logoutSuccess } from 'src/app/store/Authentication/authentication.actions';
import { PermissionUserService } from './api-users/permission-user.service';
import { TokenStorageService } from './token-storage.service';

import { UserRol } from 'src/app/core/constants/UserData';
import { EncargadoService } from './api/encargado.service';
import { ContribuyentesService } from './api/contribuyentes.service';
import { BehaviorSubject, firstValueFrom, of, Subject, timeout } from 'rxjs';
import { UserService } from './api-users/users.service';
import { ConfiguracionSistemaService } from './api/configuracionSistema.service';
import { ConfiguracionSistema } from '../models/configuracionSistema.model';
import { AplicaAConfiguracion, ClaveConfiguracion } from '../constants/Configurations';
import { RuatRequestsService } from './ruatRequest.service';
import { LoginResponse } from '../models/user/login-response.model';
import { GlobalComponent } from 'src/app/global-component';
import { MenuItem } from '../models/menu.model';
import { MENU_BASE } from '../data/menu';

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
  APP_NAME = GlobalComponent.NAME_APP;
  adminPermission = GlobalComponent.ADMIN_MENU;  
  userRole!: 'Contribuyente' | 'Admin' | 'Encargado';
  private currentUserSubject: any;
  private loginEventSubject = new Subject<LoginEvent>();
  loginEvent$ = this.loginEventSubject.asObservable();
  private systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  private readonly ruatLoginTimeoutMs = 8000;
  private readonly ruatTokenTtlMinutes = 55;
  public systemStatus = {
    backend: false,
    configurations: false,
    ruat: false,
    message: ''
  };

  constructor(
    private http: HttpClient, 
    private router: Router,
    private authUserService: UserService,
    private authContribuyente: ContribuyentesService,
    private staffService: EncargadoService,
    private permissionService: PermissionUserService,
    private systemConfigsService: ConfiguracionSistemaService,
    private ruatService: RuatRequestsService,
    private storageService: TokenStorageService,
  ) {
    this.currentUserSubject = storageService.getUser()
    this.systemConfigList = this.storageService.getConfigs() || {};
  }

  initializeSession(){

  }
  emitLoginEvent(event: LoginEvent) {
    this.loginEventSubject.next(event);
  }

  async login(username: string, password: string, rememberMe: boolean): Promise<LoginResult> {
    let staffResult: any = null;
    try {
      staffResult = await this.loginStaffUser(username, password);
    } catch (e) {
      staffResult = null;
    }
    if (staffResult?.token) {
        const modulos: string[] = staffResult.modulos || [];
        if (!modulos.includes(this.APP_NAME)) {
          return {
          success: false,
          errorType: 'NO_MODULE',
          message: 'No tiene acceso a este módulo'
        };
      };
      const permissionResult = await this.userHasPermission(staffResult);
      if(permissionResult.status !=='ADMIN' && permissionResult.status!== 'STAFF'){
        switch (permissionResult.status) {
          case 'NO_ADMIN_PERMISSION':
          case 'NO_PERMISSIONS':
            return {
              success: false,
              errorType: 'NO_PERMISSIONS',
              message: 'No tiene permisos para acceder a este módulo'
            };
          case 'NO_ASSIGNATION':
            return {
              success: false,
              errorType: 'NO_ASSIGNATION',
              message: 'No tiene asignación como encargado o staff'
            };
        }
      }
      const configResult = await this.loadSystemConfigs(false);
      if (!configResult.configsStatus) {
        return {
          success: false,
          errorType: 'CONFIG_ERROR',
          message: configResult.errorMessage
        };
      }
      this.storageService.saveAuthData({
        menu: this.sortMenuItemsRecursive(permissionResult.permissions),
        configs: configResult.configs || {},
        user: staffResult,
        staff: permissionResult.assignations,
        token: staffResult.token,
        ruatToken: configResult.ruatToken || ''
      }, rememberMe);
      this.emitLoginEvent({
        message: permissionResult.status ==='ADMIN' ? 'welcome_admin' : 'welcome_staff',
        configsLoaded: Object.keys(this.getAllConfigs() || {}).length,
        ruatStatus: configResult.ruatStatus
      });
      return { success: true,
        redirect: permissionResult.status === 'ADMIN' ? '/inicio' : '/inicio/employee',
      };
    }
    let contribuyenteResult: any = null;
    try {
      contribuyenteResult = await this.loginContribuyente(username, password);
    } catch (e) {
      contribuyenteResult = null;
    }
    if (!contribuyenteResult?.uuid) {
      return {
        success: false,
        errorType: 'BAD_CREDENTIALS',
        message: 'Usuario o contraseña incorrectos'
      };
    }
    const configResult = await this.loadSystemConfigs(true);
    if (!configResult.configsStatus) {
      return {
        success: false,
        errorType: 'CONFIG_ERROR',
        message: configResult.errorMessage
      };
    }
    this.storageService.saveAuthData({
      menu: this.sortMenuItemsRecursive(MENU_BASE),
      configs: configResult.configs || {},
      user: contribuyenteResult,
      staff: null,
      token: 'CONTRIBUYENTE_SESSION',
      ruatToken: configResult.ruatToken || ''
    }, rememberMe);
    this.emitLoginEvent({
      message: 'welcome_contribuyente',
      configsLoaded: Object.keys(this.getAllConfigs() || {}).length,
      ruatStatus: configResult.ruatStatus
    });
    return { success: true, redirect: '/inicio/taxpayer',};
  }

  async loginStaffUser(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await firstValueFrom(
        this.authUserService.loginByUsername(username, password)
      );
      if (!response?.token) throw 'badCredentials';
      this.currentUserSubject = response;
      return response;
    } catch (error: any) {
      if (this.isBackendError(error)) throw { backendError: true };
      if (error.status === 401) throw 'badCredentials';
      throw 'serverError';
    }
  }
  async loginContribuyente(username: string, password: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.authContribuyente.loginByUsername(username, password)
      );
      if (response?.status !=='OK') throw 'badCredentials';      
      this.currentUserSubject = response.payload;
      return response.payload;
    } catch (error: any) {
      if (this.isBackendError(error)) throw { backendError: true };
      if (error.status === 401) throw 'badCredentials';
      throw 'serverError';
    }
  }

  async userHasPermission(user: any): Promise<{
    status: 'ADMIN' | 'STAFF' | 'NO_ADMIN_PERMISSION' | 'NO_ASSIGNATION' | 'NO_PERMISSIONS';
    permissions: MenuItem[];
    assignations?: any;
  }> {
    try {
      const [userPermissions, userAssignations] = await Promise.all([
        firstValueFrom(this.permissionService.getPermissionsUser(user)),
        firstValueFrom(this.staffService.getByUserUuid(user.uuid))
          .then((res: any) => res?.status === 'OK' ? res.payload : null)
          .catch(() => null),
      ]);
      if (!Array.isArray(userPermissions) || userPermissions.length === 0) {
        return { status: 'NO_PERMISSIONS',permissions:[] };
      }
      const isAdmin = userPermissions.some(
        (p: any) => p.nombreMenu === this.adminPermission
      );
      if (isAdmin) {
        userPermissions.forEach((menu: any) => {
          if (!menu.permisoPadreDto) menu.isCollapsed = true;
        });
        return {
          status: 'ADMIN',
          permissions: userPermissions
        };
      }
      if (userAssignations && userAssignations.complejoDto) {
        userPermissions.forEach((menu: any) => {
          if (!menu.permisoPadreDto) menu.isCollapsed = true;
        });
        return {
          status: 'STAFF',
          permissions: userPermissions,
          assignations: userAssignations
        };
      }
      return { status: 'NO_ASSIGNATION' , permissions:[]};
    } catch (error) {
      throw new Error('Ocurrió un error al verificar los permisos');
    }
  }
  public async loadSystemConfigs(
    isContribuyente: boolean
  ): Promise<{
    configsStatus: boolean;
    configs?: { [key: string]: ConfiguracionSistema };
    ruatStatus: boolean;
    ruatToken?: string;
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
        this.systemConfigsService.getAll()
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
      if (configResponse.status !== 'OK' || !Array.isArray(configResponse.payload)) {
        this.systemStatus.message = 'Invalid configuration response';
        return {
          configsStatus: false,
          ruatStatus: false,
          errorType: 'INVALID_RESPONSE',
          errorMessage: this.systemStatus.message
        };
      }
      const configsMap: { [key: string]: ConfiguracionSistema } = {};
      for (const config of configResponse.payload) {
        if (!config.activo) continue;
        if (!isContribuyente && config.aplicaA === AplicaAConfiguracion.USUARIO) continue;
        configsMap[config.clave] = config;
      }
      this.systemConfigList = configsMap;
      this.systemStatus.backend = true;
      this.systemStatus.configurations = true;
      const ruatResult = await this.authRuat(configsMap);
      this.systemStatus.ruat = ruatResult.success;
      if (!ruatResult.success) {
        this.systemStatus.message = 'RUAT authentication failed';
      }
      return {
        configsStatus: true,
        configs: configsMap,
        ruatStatus: ruatResult.success,
        ruatToken: ruatResult.token,
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

  private async authRuat(
    configsMap: { [key: string]: ConfiguracionSistema }
  ): Promise<{ success: boolean; token?: string; error?: any }> {
    if (this.storageService.isRuatTokenFresh(this.ruatTokenTtlMinutes)) {
      return { success: true, token: this.storageService.getTokenRuat()?? undefined }
    }
    this.ruatService.removeToken();
    const usuario = configsMap[ClaveConfiguracion.USUARIO_RUAT]?.valorTexto || '';
    const clave = configsMap[ClaveConfiguracion.CLAVE_RUAT]?.valorTexto || '';
    if (!usuario || !clave) {
      return { success: false, error: 'Missing RUAT credentials' };
    }
    try {
      const response: any = await firstValueFrom(
        this.ruatService.authenticate(usuario, clave).pipe(timeout(this.ruatLoginTimeoutMs))
      );
      if (response?.token) {
        this.ruatService.setToken(response.token);
        return { success: true, token: response.token };
      }
      return { success: false, error: 'Invalid RUAT token' };
    } catch (error) {
      return { success: false, error };
    }
  }

  async ensureRuatAuthenticated(forceRefresh: boolean = false): Promise<RuatAvailabilityResult> {
    if (!forceRefresh && this.storageService.isRuatTokenFresh(this.ruatTokenTtlMinutes)) {
      return { available: true };
    }

    if (forceRefresh) {
      this.ruatService.removeToken();
    }

    const configs = this.storageService.getConfigs();
    if (!configs || Object.keys(configs).length === 0) {
      return {
        available: false,
        message: 'No se pudo verificar RUAT porque no hay configuraciones cargadas. Cierre sesion e ingrese nuevamente.'
      };
    }

    const ruatResult = await this.authRuat(configs);
    this.systemStatus.ruat = ruatResult.success;

    if (ruatResult.success) {
      return { available: true };
    }

    return {
      available: false,
      message: 'RUAT no esta disponible o la sesion RUAT expiro. Intente nuevamente en unos minutos.'
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
    return this.storageService.isRuatTokenFresh(this.ruatTokenTtlMinutes);
  }
  getSystemConfig(clave: string): ConfiguracionSistema | undefined {
    return this.systemConfigList[clave];
  }
  getAllConfigs(): { [key: string]: ConfiguracionSistema } {
    return this.storageService.getConfigs();
  }


  isAdmin(): boolean {
    const menu = this.storageService.getMenu();
    return menu.some(permission => permission.nombreMenu === this.adminPermission)
  }
  getUserRole(): 'Contribuyente' | 'Admin' | 'Encargado' {
    const token =  this.storageService.getToken()?.trim();
    const menu =this.storageService.getMenu();
      if(token==='CONTRIBUYENTE_SESSION'){
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
    if (this.storageService.getToken() === 'CONTRIBUYENTE_SESSION') {
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
    const token = this.storageService.getToken(); 
    const user =  this.storageService.getUser(); 
    const menu = this.storageService.getMenu();
    let avatar="default-profile1.png";
    let role;
    if(token==='CONTRIBUYENTE_SESSION'){
      role = UserRol.find(item => item.tipo == 2);//CLIENT
    }else if (menu.some((permission:any) => permission.nombreMenu === this.adminPermission)) {
      role = UserRol.find(item => item.tipo === 0);//ADMINISTRADOR
    } else {
      role = UserRol.find(item => item.tipo == 1);//STAFF
    }
    if (role !== undefined) {
      avatar = role.avatarF;
      if (user?.designacion && user.designacion.personaDto.sexo === 'M') {
        avatar = role.avatarM;
      }
    }  
    return avatar
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
