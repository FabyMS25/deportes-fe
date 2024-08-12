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
        // this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(sessionStorage.getItem('currentUser')!));
        // this.currentUser = this.currentUserSubject.asObservable();
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
          this.hasPermission(data);
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
          console.log('Login successful', data);
          this.currentUserSubject = data;
          this.storageService.saveToken("isContribuyente");
          this.storageService.saveUser(data);
          const menu = MENU_BASE;
          localStorage.setItem('menu', JSON.stringify(menu));
          this.router.navigate(['/inicio/taxpayer']).then(() => {
            this.toastService.show('¡Bienvenido!', 'Inicio de sesión exitoso');
          });
          resolve(true);
        },
        error: () => resolve(false)
      });
    });
  }
  
  async hasPermission(user: any) {
    try {
      const [userPermissions, empleado] = await Promise.all([
        this.permissionService.getPermisosUsuario(user.uuid).toPromise(),
        this.designationsService.getByUserUuid(user.uuid).toPromise(),
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
    hasPermissionModulo(modulo: string): string[] {
      const menuString = localStorage.getItem('menu');
      const menu: any[] = menuString ? JSON.parse(menuString) : null;
      const permissions = menu.filter(permission => permission.nombreMenu === modulo);
      return permissions.map(permission => permission.accion);
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

