import { Injectable } from '@angular/core';
// import { User } from 'src/app/store/Authentication/auth.models';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';
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
    // currentUserValue: any;

    currentUserSubject: any;//BehaviorSubject<User>;
    // public currentUser: Observable<User>;

    permisoAdmin ='Administracion'
    private empleado:any;
    private contribuyente:any;
    // private currentUser: any;

    isAuthenticated: boolean = false;
    userRol:any[]=[];

    constructor(private http: HttpClient, private store: Store,
        private authUser: AuthUserService,
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
    loginUser(username: string, password: string): Observable<boolean> {
      return this.authUser.loginByUsername(username, password).pipe(
        map((data: any) => {
          // Aquí puedes manejar los datos de la respuesta si es necesario
          return true; // Devolvemos true si la autenticación es exitosa
        }),
        catchError((error: any) => {
          console.error("Login error:", error);
          return of(false); // Devolvemos false si hay un error
        })
      );
    }

    async login(username: string, password: string): Promise<boolean> {
      try {
          return new Promise<boolean>((resolve, reject) => {
              this.authUser.loginByUsername(username, password).subscribe({
                  next: (data) => {
                      this.currentUserSubject = data;
                      // this.storageService.saveUser(data);
                      this.storageService.saveToken(data.token);
                      this.hasPermission(data);
                      resolve(true);
                  },
                  error: (error: any) => {
                      console.error("Login error:", error);
                                  
                      // this.router.navigate(['/inicio/taxpayer']).then(() => {
                      //   this.toastService.show('¡Bienvenido!', 'Inicio de sesión exitoso');
                      // });
                      resolve(false);
                  }
              });
          });
      } catch (error) {
          console.error("Error in logInSubmit:", error);
          return false;
      }
  }
  
  async hasPermission(user: any) {
    try {
      const [userPermissions, empleado] = await Promise.all([
        this.permissionService.getPermisosUsuario(user.uuid).toPromise(),
        this.designationsService.getByUserUuid(user.uuid).toPromise(),
      ]);
      this.empleado = empleado
  
      if (userPermissions && Array.isArray(userPermissions) && userPermissions.length > 0) {
        if (empleado !== null || userPermissions.some(permission => permission.nombreMenu === this.permisoAdmin)) {
          this.isAuthenticated = true;
          userPermissions.forEach((menu: any) => {
            if (!menu.permisoPadreDto) {
              menu.isCollapsed = true;
            }
          });
          this.storageService.saveUser(user);
          // localStorage.setItem('currentUser', JSON.stringify(this.currentUserSubject));
          localStorage.setItem('menu', JSON.stringify(userPermissions));  
  
          if (userPermissions.some(permission => permission.nombreMenu === this.permisoAdmin)) {
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
        this.empleado = null;
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

    
    hasPermissionModulo(modulo: string): string[] {
      const menuString = localStorage.getItem('menu');
      const menu: any[] = menuString ? JSON.parse(menuString) : null;
      const permissions = menu.filter(permission => permission.nombreMenu === modulo);
      return permissions.map(permission => permission.accion);
    }


    public getAvatar(): string{    
      let avatar="default-profile1.png";
      const menuString = localStorage.getItem('menu');
      const menu: any[] = menuString ? JSON.parse(menuString) : null;
      let tipoUser;
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
      return avatar
    }

}

