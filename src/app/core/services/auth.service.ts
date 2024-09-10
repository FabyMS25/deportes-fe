import { Injectable } from '@angular/core';
// import { User } from 'src/app/store/Authentication/auth.models';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { GlobalComponent } from "../../global-component";
import { Store } from '@ngrx/store';
import { RegisterSuccess, loginFailure, loginSuccess, logout, logoutSuccess } from 'src/app/store/Authentication/authentication.actions';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/account/auth/login/toast-service';
import { TokenStorageService } from './token-storage.service';
import { AuthUserService } from './api-users/auth.service';
import { PermissionUserService } from './api-users/permission-user.service';

import { UserRol } from 'src/app/core/constants/UserData';
import { EncargadoService } from './api/encargado.service';
import { MENU_BASE } from 'src/app/core/constants/menu';
import { ContribuyentesService } from './api/contribuyentes.service';

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
        private authUser: AuthUserService,
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


    /**
     * Performs the auth
     * @param username username of user
     * @param password password of user
     */
  async login(username: string, password: string): Promise<boolean> {
    try {
      const [empleadoResult, contribuyenteResult] = await Promise.all([
        this.loginEmpleado(username, password),
        this.loginContribuyente(username, password)
      ]);
  
      if (empleadoResult) {
        return true;
      } else if (contribuyenteResult) {
        // this.router.navigate(['/inicio/taxpayer']).then(() => {
        //   this.toastService.show('¡Bienvenido!', 'Inicio de sesión exitoso');
        // });
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error in login:", error);
      return false;
    }
  }
  
  private loginEmpleado(username: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.authUser.loginByUsername(username, password).subscribe({
        next: (data) => {
          this.currentUserSubject = data;
          this.storageService.saveToken(data.token);
          this.userHasPermission(data);
          resolve(true);
        },
        error: () => resolve(false)
      });
    });
  }
  
  private loginContribuyente(username: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.authContribuyente.loginByUsername(username, password).subscribe({
        next: (data:any) => {
          if(data['status']=== 'OK'){
            this.currentUserSubject = data.payload;
            this.storageService.saveToken("isContribuyente");
            this.storageService.saveUser(this.currentUserSubject);
            localStorage.setItem('menu', JSON.stringify(MENU_BASE));
            this.router.navigate(['/inicio/taxpayer']).then(() => {
              this.toastService.show('¡Bienvenido!', 'Inicio de sesión exitoso');
            });
            resolve(true);
          }
        },
        error: () => resolve(false)
      });
    });
  }
  
  private async userHasPermission(user: any) {
    try {
      const [userPermissions, empleado] = await Promise.all([
        this.permissionService.getPermisosUsuario(user.uuid).toPromise(),
        this.designationsService.getByUserUuid(user.uuid).toPromise()
          .then((response:any) => {
            if (response && response.status === 'OK') {
              return response.payload;
            } else {
              return null;
            }
          })
          .catch(error => {
            return null; 
          }),
      ]);
      
      if (userPermissions && Array.isArray(userPermissions) && userPermissions.length > 0) {
        if (empleado !== null || this.isSuperAdmin(userPermissions)) {
          this.isAuthenticated = true;
          userPermissions.forEach((menu: any) => {
            if (!menu.permisoPadreDto) {
              menu.isCollapsed = true;
            }
          });
          this.storageService.saveUser(user);
          localStorage.setItem('menu', JSON.stringify(userPermissions));  
  
          if (this.isSuperAdmin(userPermissions)) {
            this.router.navigate(['/inicio']).then(() => {
              this.toastService.show('¡Bienvenido!', 'Inicio de sesión exitoso');
            });
            return;
          }
  
          localStorage.setItem('assignaments', JSON.stringify(empleado));
          this.router.navigate(['/inicio/employee']).then(() => {
            this.toastService.show('¡Bienvenido!', 'Inicio de sesión exitoso');
          });
          

        } else {
          this.storageService.signOut();
          this.toastService.show("El usuario no cuenta con los permisos necesarios en esta aplicación, Comunicarse con Administrador");
        }
      } else {
        this.storageService.signOut();
        this.toastService.show("El usuario no cuenta con permisos");
      }
    } catch (error) {
      console.error('Error in hasPermission:', error);
      this.toastService.show("Ocurrió un error al verificar los permisos");
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
    isSuperAdmin(menu:any[]):boolean{    
      return menu.some(permission => permission.nombreMenu === this.permisoAdmin)
    }

    getRouteDB():string{      
      if(this.storageService.getToken()==="isContribuyente"){
        return 'taxpayer'
      }else{
        if (!this.isAdmin()) {
          return 'employee'
        }
      }      
      return ''
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
        if (this.isSuperAdmin(menu)) {
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

