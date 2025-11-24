import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { logout, logoutSuccess } from 'src/app/store/Authentication/authentication.actions';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/account/auth/login/toast-service';
import { TokenStorageService } from './token-storage.service';
import { PermissionUserService } from './api-users/permission-user.service';

import { UserRol } from 'src/app/core/constants/UserData';
import { EncargadoService } from './api/encargado.service';
import { ContribuyentesService } from './api/contribuyentes.service';
import { of } from 'rxjs';
import { UserService } from './api-users/users.service';
import { Contribuyente } from '../models/contribuyente.model';
import { EncargadoComplejo } from '../models/encargadoComplejo';
import { ConfiguracionSistemaService } from './api/configuracionSistema.service';
import { ConfiguracionSistema } from '../models/configuracionSistema.model';
import { AplicaAConfiguracion, ClaveConfiguracion } from '../constants/Configurations';
import { RuatRequestsService } from './ruat/ruatRequest.service';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {

  adminPermission = 'Administracion'
  userRole!: 'Contribuyente' | 'Admin' | 'Encargado';
  currentUserSubject: any;
  isAuthenticated: boolean = false;
  private systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  private configsLoaded: boolean = false;
  private ruatAuthenticated: boolean = false;
  private backendAvailable: boolean = false;

  constructor(
    private http: HttpClient, 
    private store: Store,
    private router: Router,
    private authUser: UserService,
    private authContribuyente: ContribuyentesService,
    private designationsService: EncargadoService,
    private permissionService: PermissionUserService,
    private systemConfigsService: ConfiguracionSistemaService,
    private ruatService: RuatRequestsService,
    private storageService: TokenStorageService,
    private toastService: ToastService,
  ) {
    this.currentUserSubject = storageService.getUser()
    this.isAuthenticated = !!storageService.getToken();
  }

  async loginEmployee(username: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.authUser.loginByUsername(username, password).subscribe({
        next: async (data) => {
          this.currentUserSubject = data;
          this.storageService.saveToken(data.token);          
          // const configsLoaded = await this.loadSystemConfigs(false);
          // if (!configsLoaded) {
          //   this.showBackendDownError();
          //   this.logout();
          //   resolve(null);
          //   return;
          // }       
          resolve(data);
        },
        error: (error) => {
          if (this.isBackendError(error)) {
            resolve({ backendError: true, error });
          } else {
            resolve(null);
          }
        }
      });
    });
  }
  async loginContribuyente(username: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.authContribuyente.loginByUsername(username, password).subscribe({
        next: async (data: any) => {
          if (data['status'] === 'OK') {
            this.currentUserSubject = data.payload;
            this.storageService.saveToken("isContribuyente");
            this.storageService.saveUser(this.currentUserSubject);            
            // const configsLoaded = await this.loadSystemConfigs(true);
            // if (!configsLoaded) {
            //   this.showBackendDownError();
            //   this.logout();
            //   resolve(false);
            //   return;
            // } 
            // const sortedMenu = this.sortMenuItemsRecursive(MENU_BASE);
            // localStorage.setItem('menu', JSON.stringify(sortedMenu));          
            resolve(data);
          } else {
            resolve(null);
          }
        },
        error: (error) => {
        if (this.isBackendError(error)) {
          resolve({ backendError: true, error });
        } else {
          resolve(null);
        }
        }
      });
    });
  }

  private isBackendError(error: any): boolean {
    return (
      error.status === 0 ||
      error.name === 'HttpErrorResponse' ||
      (error.error && error.error instanceof ProgressEvent) ||
      error.message?.includes('CORS') ||
      error.message?.includes('Network') ||
      error.message?.includes('Failed to fetch')
    );
  }
  async userHasPermission(user: any): Promise<{status: 'isAdmin' | 'isEmployee' | 'hasNoPermissions', permissions?: any[], assignations?: any}> {
    try {
      const [userPermissions, userAssignations] = await Promise.all([
        this.permissionService.getPermisosUsuario(user.uuid).toPromise(),
        this.designationsService.getByUserUuid(user.uuid).toPromise()
          .then((response: any) => response?.status === 'OK' ? response.payload : null)
          .catch(error => null),
      ]);
      if (userPermissions && Array.isArray(userPermissions) && userPermissions.length > 0) {
        const isAdmin = userPermissions.some(permission => permission.nombreMenu === this.adminPermission);
        if (userAssignations !== null || isAdmin) {
          this.isAuthenticated = true;
          userPermissions.forEach((menu: any) => {
            if (!menu.permisoPadreDto) {
              menu.isCollapsed = true;
            }
          });
          this.storageService.saveUser(user);
          if (isAdmin) {
            return { 
              status: 'isAdmin', 
              permissions: userPermissions, 
              assignations: null 
            };
          } else {
            return { 
              status: 'isEmployee', 
              permissions: userPermissions, 
              assignations: userAssignations 
            };
          }
        } else {
          return { status: 'hasNoPermissions' };
        }
      } else {
        return { status: 'hasNoPermissions' };
      }
    } catch (error) {
      this.toastService.show(
        'Error de Permisos: Ocurrió un error al verificar los permisos de usuario. Por favor, contacte al administrador.',
        'error'
      );
      throw new Error('Ocurrió un error al verificar los permisos');
    }
  }

  hasPermission(modulo: string): string[] {
    const menuString = localStorage.getItem('menu');
    const menu: any[] = menuString ? JSON.parse(menuString) : null;
    const permissions = menu.filter(permission => permission.nombreMenu === modulo);
    return permissions.map(permission => permission.accion);
  }
  hasRoutePermission(route: string): boolean {
    const menuString = localStorage.getItem('menu');
    const menu: any[] = menuString ? JSON.parse(menuString) : null;
    const permissions = menu.filter(permission => permission.ruta === route);
    return menu.find(permission => permission.ruta === route) ? true : false;
  }
  
  getDashboardUrl(): string {
    const dashboardRoutes = ['/inicio', '/inicio/employee', '/inicio/taxpayer'];
    const storedMenu = localStorage.getItem('menu');
    const userMenu = storedMenu ? JSON.parse(storedMenu) : null;
    const userDashboard = userMenu.find((item: any) => dashboardRoutes.includes(item.ruta));
    return userDashboard ? userDashboard.ruta : '/auth/login';
  }

  /**
   * GETTERS
   */ 
  public currentUser(): any {
    return this.currentUserSubject;
  }
  public isLoggedIn(): boolean {
    return this.isAuthenticated;
  }
  isAdmin(): boolean {
    const menuString = localStorage.getItem('menu');
    const menu: any[] = menuString ? JSON.parse(menuString) : null;
    return menu.some(permission => permission.nombreMenu === this.adminPermission)
  }
  getUserFullName(): string {
    if (!this.currentUserSubject) return '';    
    if (this.storageService.getToken() === 'isContribuyente') {
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
  getUserRole(): 'Contribuyente' | 'Admin' | 'Encargado' {
    if (this.storageService.getToken() === 'isContribuyente') {
      return 'Contribuyente';
    } else { 
      if (this.isAdmin()) {
        return 'Admin';
      }
      return 'Encargado';
    }
  }
  getAvatar(): string {
    if (!this.currentUserSubject) return 'default-profile1.png';       
    if (this.storageService.getToken() === 'isContribuyente') {
      const tipoUser = UserRol.find(item => item.tipo == 2); // Contribuyente
      if (this.currentUserSubject.genero === 'F') {
        return tipoUser?.avatarF || '';
      } else return tipoUser?.avatarM || ''
    } else if (this.isAdmin()) {
      const tipoUser = UserRol.find(item => item.tipo === 0); // ADMINISTRADOR
      if (this.currentUserSubject.designacion.personaDto.sexo === 'F') {
        return tipoUser?.avatarF || '';
      } else return tipoUser?.avatarM || ''
    } else {
      const data = localStorage.getItem('assignaments')
      const employee = data ? JSON.parse(data) : null;      
      return employee.avatar;
    }
  }
  getAllConfigs(): { [key: string]: ConfiguracionSistema } {
    try {
      const storedConfigs = localStorage.getItem('systemConfigs');
      if (storedConfigs) {
        this.systemConfigList = JSON.parse(storedConfigs);
      }
    } catch (error) {
      this.systemConfigList = {};
    }
    return this.systemConfigList;
  }
  getSystemConfig(clave: string): ConfiguracionSistema | undefined {
    return this.systemConfigList[clave];
  }
  areConfigsLoaded(): boolean {
    return this.configsLoaded;
  }
  isRuatAuthenticated(): boolean {
    return this.ruatAuthenticated;
  }
  isBackendAvailable(): boolean {
    return this.backendAvailable;
  }

  public async loadSystemConfigs(isContribuyente: boolean): Promise<{success: boolean, configCount?: number, error?: any}> {
    try {
      const configResponse: any = await this.systemConfigsService.getAll().toPromise();
      if (!configResponse) {
        this.backendAvailable = false;
        this.configsLoaded = false;
        return { success: false, error: 'No response from backend' };
      }      
      if (configResponse.status !== 'OK') {
        this.backendAvailable = false;
        this.configsLoaded = false;
        return { success: false, error: 'Invalid response status' };
      }      
      const configsMap: { [key: string]: ConfiguracionSistema } = {};
      let configCount = 0;
      configResponse.payload.forEach((config: ConfiguracionSistema) => {
        if (config.activo) {
          if (!isContribuyente && config.aplicaA === AplicaAConfiguracion.USUARIO) {
            return;
          }
          configsMap[config.clave] = config;
          configCount++;
        }
      });      
      this.systemConfigList = configsMap;
      localStorage.setItem('systemConfigs', JSON.stringify(this.systemConfigList));
      this.configsLoaded = true;
      this.backendAvailable = true;
      if (configCount > 0) {
        this.toastService.show('Configuración Cargada',`Se cargaron ${configCount} configuraciones del sistema correctamente.`);
        this.authRuat(configsMap);
      } else {
        this.toastService.show(
          'Configuración del Sistema, No se encontraron configuraciones activas en el sistema. Algunas funcionalidades podrían no estar disponibles.',
          'warning'
        );
      }      
      return { success: true, configCount };
    } catch (error) {
      console.error('Configuration load error:', error);
      this.backendAvailable = false;
      this.configsLoaded = false;
      return { success: false, error };
    }
  }

  // private async authRuat(usuario: string, clave: string): Promise<boolean> {
  //   return new Promise((resolve) => {
  //     if (usuario && clave) {
  private authRuat(configsMap: { [key: string]: ConfiguracionSistema }): void {
    const usuario = configsMap[ClaveConfiguracion.USUARIO_RUAT]?.valorTexto || '';
    const clave = configsMap[ClaveConfiguracion.CLAVE_RUAT]?.valorTexto || '';    
    if (!usuario || !clave) {
      console.warn('RUAT credentials not found in configurations');
      return;
    }    
    this.ruatService.authenticate(usuario, clave).subscribe({
      next: (response) => {
        if (response && response.token) {
          this.ruatService.setToken(response.token);
          this.ruatAuthenticated = true;
          setTimeout(() => {
            this.toastService.show('Conexión RUAT Exitosa','La conexión con el sistema RUAT se estableció correctamente.');
          }, 500);
          } else {
            setTimeout(() => {
              this.toastService.show(
                'Error RUAT: No se recibió un token válido del RUAT. La integración con RUAT no estará disponible.',
                'error'
              );
            }, 2000);
          }
          // resolve(false);
      },
      error: (error) => {
          console.error('RUAT Authentication error:', error);
          setTimeout(() => {
            this.toastService.show(
              'Error de Conexión RUAT: No se pudo conectar con el RUAT. Algunas funcionalidades podrían estar limitadas.',
              'error'
            );
          }, 2000);
          // resolve(false);
      }
    });
  }
  
  /*
   * Logout the user
   */
  logout() {
    this.store.dispatch(logout());
    localStorage.removeItem('assignaments');
    localStorage.removeItem('menu');
    localStorage.removeItem('systemConfigs');
    this.storageService.signOut();
    this.isAuthenticated = false;
    this.currentUserSubject = null;
    this.configsLoaded = false;
    this.ruatAuthenticated = false;
    this.router.navigate(['/auth/login']);
    this.store.dispatch(logoutSuccess());
    return of(undefined).pipe();
  }
}