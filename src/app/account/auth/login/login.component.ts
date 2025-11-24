import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// Login Auth
import { AuthenticationService } from '../../../core/services/auth.service';
import { ToastService } from './toast-service';
import Swal from 'sweetalert2';
import { MENU_BASE } from 'src/app/core/data/menu';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})

export class LoginComponent implements OnInit {
  loginForm!: UntypedFormGroup;
  submitted = false;
  fieldTextType!: boolean;
  error = '';
  returnUrl!: string;
  toast!: false;
  year: number = new Date().getFullYear();

  isCheckingConnection: boolean = false;
  backendError: boolean = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private authenticationService: AuthenticationService,
    private toastService: ToastService,
    private router: Router,) {
      if (!this.authenticationService.currentUserSubject) {
        this.router.navigate(['/auth/login']);
      }
     }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }
  get form() {
    return this.loginForm.controls;
  }

  async onSubmit() {
    this.submitted = true;
    this.backendError = false;    
    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    try {
      this.isCheckingConnection = true;
      const username = this.form['username'].value;
      const password = this.form['password'].value;
      const [empleadoResult, contribuyenteResult] = await Promise.all([
        this.authenticationService.loginEmployee(username, password),
        this.authenticationService.loginContribuyente(username, password)
      ]);
      if (empleadoResult?.backendError || contribuyenteResult?.backendError) {
        this.showBackendDownError();
        this.isCheckingConnection = false;
        return;
      }
      const configResult = await this.authenticationService.loadSystemConfigs(!!contribuyenteResult );      
      if (!configResult.success) {
        this.showBackendDownError();
        this.authenticationService.logout();
        this.isCheckingConnection = false;
        return;
      }

      if (empleadoResult && !empleadoResult.backendError) {
        const configResult = await this.authenticationService.loadSystemConfigs(false);
        if (!configResult.success) {
          this.showBackendDownError();
          this.authenticationService.logout();
          this.isCheckingConnection = false;
          return;
        }
        const permissionResult  = await this.authenticationService.userHasPermission(empleadoResult);
        
        if (permissionResult.status === 'isAdmin') {
          const sortedMenu = this.sortMenuItemsRecursive(permissionResult.permissions!);
          localStorage.setItem('menu', JSON.stringify(sortedMenu));
          this.router.navigate(['/inicio'], { 
            queryParams: { message: 'welcome_admin' } 
          });
        } else if (permissionResult.status === 'isEmployee') {
          const sortedMenu = this.sortMenuItemsRecursive(permissionResult.permissions!);
          localStorage.setItem('menu', JSON.stringify(sortedMenu));
          localStorage.setItem('assignaments', JSON.stringify(permissionResult.assignations));
          this.router.navigate(['/inicio/employee'], { 
            queryParams: { message: 'welcome_employee' } 
          });
        } else {
          this.loginForm.setErrors({ invalidPermissions: true });
        }
      } else if (contribuyenteResult && !contribuyenteResult.backendError) {
        const sortedMenu = this.sortMenuItemsRecursive(MENU_BASE);
        localStorage.setItem('menu', JSON.stringify(sortedMenu));
        this.router.navigate(['/inicio/taxpayer'], { 
          queryParams: { message: 'welcome_taxpayer' } 
        });

      } else {
        this.loginForm.setErrors({ invalidLogin: true });
      }
      this.isCheckingConnection = false;
    } catch (error: any) {
      this.isCheckingConnection = false;
      this.loginForm.setErrors({ serverError: true });
    }
  }

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }
  
  private sortMenuItemsRecursive(menuItems: any[]): any[] {
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
  private sortMenuItems(menuItems: any[]): any[] {
    return menuItems.sort((a, b) => {
      const orderCompare = (a.orden || 0) - (b.orden || 0);
      if (orderCompare !== 0) return orderCompare;
      const aPriority = this.getActionPriority(a.accion);
      const bPriority = this.getActionPriority(b.accion);
      return aPriority - bPriority;
    });
  }
  private getActionPriority(accion: string): number {
    const actionOrder = ['VER', 'CREAR', 'EDITAR', 'ACTUALIZAR', 'VALIDAR', 'ANULAR', 'GENERAR TICKET', 'CAMBIAR-HORARIO', 'EXPORTAR', 'BLOQUEAR', 'ELIMINAR'];
    const index = actionOrder.indexOf(accion);
    return index !== -1 ? index : actionOrder.length;
  }
  
  private showBackendDownError(): void {
    this.backendError = true;
      Swal.fire({
        title: 'Servicio No Disponible',
        text: 'El sistema principal no está disponible en este momento. Por favor, intente más tarde.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Entendido',
        allowOutsideClick: false,
        allowEscapeKey: false
      });
    }
}
