import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GlobalComponent } from "../../global-component";
import { Store } from '@ngrx/store';
import { RegisterSuccess, loginFailure, loginSuccess, logout, logoutSuccess } from 'src/app/store/Authentication/authentication.actions';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/account/auth/login/toast-service';
import { TokenStorageService } from './token-storage.service';
import { PermissionUserService } from './api-users/permission-user.service';

import { UserRol } from 'src/app/core/constants/UserData';
import { EncargadoService } from './api/encargado.service';
import { MENU_BASE } from 'src/app/core/data/menu';
import { ContribuyentesService } from './api/contribuyentes.service';
import { of } from 'rxjs';
import { UserService } from './api-users/users.service';
import { Contribuyente } from '../models/contribuyente.model';
import { EncargadoComplejo } from '../models/encargadoComplejo';
import { ConfiguracionSistemaService } from './api/configuracionSistema.service';
import { ConfiguracionSistema } from '../models/configuracionSistema.model';
import { AplicaAConfiguracion } from '../constants/Configurations';

const AUTH_API = ""//GlobalComponent.AUTH_API;

const httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };


@Injectable({ providedIn: 'root' })

export class AuthenticationService {

  adminPermission ='Administracion'
  userRole!:'Contribuyente'| 'Admin' | 'Encargado';
  currentUserSubject: any;
  isAuthenticated: boolean = false;
  private systemConfigs: { [key: string]: ConfiguracionSistema } = {};

  constructor(private http: HttpClient, private store: Store,
        private authUser: UserService,
        private authContribuyente: ContribuyentesService,
        private designationsService: EncargadoService,
        private permissionService: PermissionUserService,
        private systemConfigsService: ConfiguracionSistemaService,
        private router: Router,
        private storageService: TokenStorageService,
        private toastService: ToastService,

  ) {
    // this.loadSystemConfigs()
    this.currentUserSubject = storageService.getUser()
    this.isAuthenticated = !!storageService.getToken();
  }

    async loginEmployee(username: string, password: string): Promise<any> {
      return new Promise((resolve, reject) => {
        this.authUser.loginByUsername(username, password).subscribe({
          next: async (data) => {
            this.currentUserSubject = data;
            this.storageService.saveToken(data.token);
            // this.userHasPermission(data);
            await this.loadSystemConfigs(false);
            resolve(data);
          },
          error: (error) => {
            resolve(null);
          }
        });
      });
    }
  async loginContribuyente(username: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.authContribuyente.loginByUsername(username, password).subscribe({
        next: async (data: any) => {
          if (data['status'] === 'OK') {
            this.currentUserSubject = data.payload;
            this.storageService.saveToken("isContribuyente");
            this.storageService.saveUser(this.currentUserSubject);
            
            const sortedMenu = this.sortMenuItemsRecursive(MENU_BASE);
            localStorage.setItem('menu', JSON.stringify(sortedMenu));
            
            await this.loadSystemConfigs(true);
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: (error) => {
          resolve(false);
        }
      });
    });
  }

  async userHasPermission(user: any): Promise<'isAdmin' | 'isEmployee' | 'hasNoPermissions'> {
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
          
          const sortedMenu = this.sortMenuItemsRecursive(userPermissions);
          localStorage.setItem('menu', JSON.stringify(sortedMenu));
          
          if (isAdmin) {
            return 'isAdmin';
          } else {
            localStorage.setItem('assignaments', JSON.stringify(userAssignations));
            return 'isEmployee';
          }
        } else {
          return 'hasNoPermissions';
        }
      } else {
        return 'hasNoPermissions';
      }
    } catch (error) {
      console.error('Error in hasPermission:', error);
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
      const userDashboard = userMenu.find((item:any) => dashboardRoutes.includes(item.ruta));
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

    isAdmin():boolean{
      const menuString = localStorage.getItem('menu');
      const menu: any[] = menuString ? JSON.parse(menuString) : null;
      return menu.some(permission => permission.nombreMenu === this.adminPermission)
    }
    
  getUserFullName(): string {
    if (!this.currentUserSubject) return '';   
    
    if(this.storageService.getToken() === 'isContribuyente'){
      return this.currentUserSubject.nombreCompleto || 
             (this.currentUserSubject.nombre + ' ' + this.currentUserSubject.primerApellido + 
              (this.currentUserSubject.segundoApellido ? ' ' + this.currentUserSubject.segundoApellido : '')) || 
             this.currentUserSubject.userName || 
             'Contribuyente';
    }else{
      return this.currentUserSubject.designacion?.personaDto?.fullName || 
             (this.currentUserSubject.designacion?.personaDto?.nombre + ' ' + 
              this.currentUserSubject.designacion?.personaDto?.apPaterno) || 
             this.currentUserSubject.username || 
             'Usuario';

    }
    return this.currentUserSubject.username || this.currentUserSubject.userName || 'Usuario';
  }

  getUserRole(): 'Contribuyente' | 'Admin' | 'Encargado' {
    if(this.storageService.getToken() === 'isContribuyente'){
      return 'Contribuyente';
    }else{ if (this.isAdmin()) {
          return 'Admin';
      }
      return 'Encargado';
    }
  }

  getAvatar(): string {
    if (!this.currentUserSubject) return 'default-profile1.png';       
    if(this.storageService.getToken() === 'isContribuyente'){
      const tipoUser = UserRol.find(item => item.tipo == 2);//Contribuyente
      if (this.currentUserSubject.genero === 'F') {
        return tipoUser?.avatarF || '';
      }else return tipoUser?.avatarM ||''
    }else if(this.isAdmin()){
      const tipoUser = UserRol.find(item => item.tipo === 0);//ADMINISTRADOR
      if (this.currentUserSubject.designacion.personaDto.sexo === 'F') {
        return tipoUser?.avatarF || '';
      }else return tipoUser?.avatarM ||''
    }else{
      const data = localStorage.getItem('assignaments')
      const employee = data ? JSON.parse(data) : null;      
      return employee.avatar;
    }
  }

  getAllConfigs(): { [key: string]: ConfiguracionSistema } {
    try {
      const storedConfigs = localStorage.getItem('systemConfigs');
      if (storedConfigs) {
        this.systemConfigs = JSON.parse(storedConfigs);
      }
    } catch (error) {
      this.systemConfigs = {};
    }
    return this.systemConfigs;
  }
  getSystemConfig(clave: string): ConfiguracionSistema | undefined {
    return this.systemConfigs[clave];
  }

  /*
   * Logout the user
  */
  logout() {
    this.store.dispatch(logout());
    localStorage.removeItem('currentUser')
    localStorage.removeItem('menu');
    localStorage.removeItem('assignaments');
    this.storageService.signOut();
    this.isAuthenticated = false;
    this.currentUserSubject = null;
    this.router.navigate(['/auth/login']);
    this.store.dispatch(logoutSuccess());
        return of(undefined).pipe(
    );
  }
  /**
   * Reset password
   * @param email email
    */
  resetPassword(email: string) {
        // return getFirebaseBackend()!.forgetPassword(email).then((response: any) => {
        //     const message = response.data;
        //     return message;
        // });
  }
  private async loadSystemConfigs(usuario:boolean): Promise<void> {
    try {
      const configResponse: any = await this.systemConfigsService.getAll().toPromise();
      if (configResponse.status === 'OK') {
        const configsMap: { [key: string]: ConfiguracionSistema } = {};        
        configResponse.payload.forEach((config: ConfiguracionSistema) => {
          if (config.activo) {
            if (!usuario && config.aplicaA === AplicaAConfiguracion.USUARIO) {
              return;
            }            
            configsMap[config.clave] = config;
          }
        });        
        this.systemConfigs = configsMap;
        localStorage.setItem('systemConfigs', JSON.stringify(configsMap));
      }
    } catch (error) {
      console.error('Failed to load system configs:', error);
    }
  }

  private getActionPriority(accion: string): number {
    const actionOrder = [
      'VER',
      'CREAR', 
      'EDITAR',
      'ACTUALIZAR',
      'VALIDAR',
      'ANULAR',
      'GENERAR TICKET',
      'CAMBIAR-HORARIO',
      'EXPORTAR',
      'BLOQUEAR',
      'ELIMINAR'
    ];    
    const index = actionOrder.indexOf(accion);
    return index !== -1 ? index : actionOrder.length;
  }
private sortMenuItemsRecursive(menuItems: any[]): any[] {
  return menuItems.map(item => {
    // Sort child items if they exist
    if (item.permisoHijoListDto && item.permisoHijoListDto.length > 0) {
      return {
        ...item,
        permisoHijoListDto: this.sortMenuItems(item.permisoHijoListDto)
      };
    }
    return item;
  }).sort((a, b) => {
    // First sort by orden field
    const orderCompare = (a.orden || 0) - (b.orden || 0);
    if (orderCompare !== 0) {
      return orderCompare;
    }
    
    // If same orden, sort by action priority
    const aPriority = this.getActionPriority(a.accion);
    const bPriority = this.getActionPriority(b.accion);
    
    return aPriority - bPriority;
  });
}
  private sortMenuItems(menuItems: any[]): any[] {
    return menuItems.sort((a, b) => {
      const orderCompare = (a.orden || 0) - (b.orden || 0);
      if (orderCompare !== 0) {
        return orderCompare;
      }
      const aPriority = this.getActionPriority(a.accion);
      const bPriority = this.getActionPriority(b.accion);      
      return aPriority - bPriority;
    });
  }
}

