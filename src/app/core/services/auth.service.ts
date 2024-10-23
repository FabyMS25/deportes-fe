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

const AUTH_API = ""//GlobalComponent.AUTH_API;

const httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };
  

@Injectable({ providedIn: 'root' })

/**
 * Auth-service Component
 */
export class AuthenticationService {

    user!: any;
    currentUserSubject: any;
    permisoAdmin ='Administracion'

    isAuthenticated: boolean = false;
    userRol:any[]=[];

    constructor(private http: HttpClient, private store: Store,
        private authUser: UserService,
        private authContribuyente: ContribuyentesService,
        private permissionService: PermissionUserService,
        private designationsService: EncargadoService,
        private storageService: TokenStorageService,
        private toastService: ToastService,
        private router: Router,

    ) {
        // this.currentUserSubject = JSON.parse(storageService.getUser())
        this.currentUserSubject = storageService.getUser()
        this.isAuthenticated = !!storageService.getToken();
    }


    async loginEmpleado(username: string, password: string): Promise<any> {
      return new Promise((resolve, reject) => {
        this.authUser.loginByUsername(username, password).subscribe({
          next: (data) => {
            this.currentUserSubject = data;
            this.storageService.saveToken(data.token);
            // this.userHasPermission(data);
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
          next: (data: any) => {
            if (data['status'] === 'OK') {
              this.currentUserSubject = data.payload;
              this.storageService.saveToken("isContribuyente");
              this.storageService.saveUser(this.currentUserSubject);
              localStorage.setItem('menu', JSON.stringify(MENU_BASE));

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
    
  
    async userHasPermission(user: any): Promise<'isAdmin' | 'isEmpleado' | 'hasNoPermissions'> {
      try {
        const [userPermissions, empleado] = await Promise.all([
          this.permissionService.getPermisosUsuario(user.uuid).toPromise(),
          this.designationsService.getByUserUuid(user.uuid).toPromise()
            .then((response: any) => response?.status === 'OK' ? response.payload : null)
            .catch(error => null),
        ]);
    
        if (userPermissions && Array.isArray(userPermissions) && userPermissions.length > 0) {
          const isAdmin = userPermissions.some(permission => permission.nombreMenu === this.permisoAdmin);
            if (empleado !== null || isAdmin) {
            this.isAuthenticated = true;
            userPermissions.forEach((menu: any) => {
              if (!menu.permisoPadreDto) {
                menu.isCollapsed = true;
              }
            });
            this.storageService.saveUser(user);
            localStorage.setItem('menu', JSON.stringify(userPermissions));            
            if (isAdmin) {
              return 'isAdmin';
            } else {
              localStorage.setItem('assignaments', JSON.stringify(empleado));
              return 'isEmpleado';
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
      
    /**
     * Returns the current user
     */
    public currentUser(): any {
        return this.currentUserSubject;
    }
    public isLoggedIn(): boolean {
      return this.isAuthenticated;
  }
    /**
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

    
    isAdmin():boolean{
      const menuString = localStorage.getItem('menu');
      const menu: any[] = menuString ? JSON.parse(menuString) : null;      
      return menu.some(permission => permission.nombreMenu === this.permisoAdmin)
    }    
    // getRouteDB():string{      
    //   if(this.storageService.getToken()==="isContribuyente"){
    //     return 'taxpayer'
    //   }else{
    //     if (!this.isAdmin()) {
    //       return 'employee'
    //     }
    //   }      
    //   return ''
    // }
    getDashboardUrl(): string {
      const dashboardRoutes = ['/inicio', '/inicio/employee', '/inicio/taxpayer'];      
      const storedMenu = localStorage.getItem('menu');
      const userMenu = storedMenu ? JSON.parse(storedMenu) : null;      
      const userDashboard = userMenu.find((item:any) => dashboardRoutes.includes(item.ruta));
      return userDashboard ? userDashboard.ruta : '/auth/login';
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


    public getAvatar(): string{    
      let avatar="default-profile1.png";
      let tipoUser;
      const menuString = localStorage.getItem('menu');
      const menu: any[] = menuString ? JSON.parse(menuString) : null;
      if(this.storageService.getToken()==="isContribuyente"){
        tipoUser = UserRol.find(item => item.tipo == 2);//Contribuyente
        if (tipoUser !== undefined) {
            avatar = tipoUser.avatarM;
            if (this.currentUserSubject.sexo === 'F') {
                avatar = tipoUser.avatarF;
            }
        }  
      }else{
        if (menu.some(permission => permission.nombreMenu === this.permisoAdmin)) {
          tipoUser = UserRol.find(item => item.tipo === 0);//ADMINISTRADOR
        } else {
          tipoUser = UserRol.find(item => item.tipo == 1);//VALIDADOR
        }
        if (tipoUser !== undefined) {
            avatar = tipoUser.avatarM;
            if (this.currentUserSubject.designacion.personaDto.sexo === 'F') {
                avatar = tipoUser.avatarF;
            }
        }  
      }
      return avatar
    }

}

