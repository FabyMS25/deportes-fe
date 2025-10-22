import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// Login Auth
import { AuthenticationService } from '../../../core/services/auth.service';
import { ToastService } from './toast-service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})

/**
 * Login Component
 */
export class LoginComponent implements OnInit {

  // Login Form
  loginForm!: UntypedFormGroup;
  submitted = false;
  fieldTextType!: boolean;
  error = '';
  returnUrl!: string;
  toast!: false;
  year: number = new Date().getFullYear();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private authenticationService: AuthenticationService,
    private router: Router,
    public toastService: ToastService) {
      // redirect to home if already logged in
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

  /**
   * Form submit
   */
  async onSubmit() {
    this.submitted = true;
    try {
      const username = this.form['username'].value;
      const password = this.form['password'].value;

      if (this.loginForm.valid) {
        const [empleadoResult, contribuyenteResult] = await Promise.all([
          this.authenticationService.loginEmpleado(username, password),
          this.authenticationService.loginContribuyente(username, password)
        ]);

        if (empleadoResult) {
          const permissionStatus = await this.authenticationService.userHasPermission(empleadoResult);
          if (permissionStatus === 'isAdmin') {
            this.router.navigate(['/inicio']).then(() => {
              this.toastService.show('¡Bienvenido Admin!', 'Inicio de sesión exitoso');
            });
          } else if (permissionStatus === 'isEmployee') {
            this.router.navigate(['/inicio/employee']).then(() => {
              this.toastService.show('¡Bienvenido Encargado!', 'Inicio de sesión exitoso');
            });
          } else {
            this.loginForm.setErrors({ invalidPermissions: true });
          }
        } else if (contribuyenteResult) {
          this.router.navigate(['/inicio/taxpayer']).then(() => {
            this.toastService.show('¡Bienvenido!', 'Inicio de sesión exitoso');
          });
        } else {
          this.loginForm.setErrors({ invalidLogin: true });
        }
      } else {
        this.loginForm.markAllAsTouched();
      }
    } catch (error:any) {
      this.loginForm.setErrors({ serverError: true });
    }
  }


  /**
   * Password Hide/Show
   */
   toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

}
