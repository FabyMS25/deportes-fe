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

export class LoginComponent implements OnInit {

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
    try {
      const username = this.form['username'].value;
      const password = this.form['password'].value;

      if (this.loginForm.valid) {
        const [empleadoResult, contribuyenteResult] = await Promise.all([
          this.authenticationService.loginEmployee(username, password),
          this.authenticationService.loginContribuyente(username, password)
        ]);
        if (empleadoResult) {
          const permissionStatus = await this.authenticationService.userHasPermission(empleadoResult);
          if (permissionStatus === 'isAdmin') {
            this.router.navigate(['/inicio'], { 
              queryParams: { message: 'welcome_admin' } 
            });
          } else if (permissionStatus === 'isEmployee') {
            this.router.navigate(['/inicio/employee'], { 
              queryParams: { message: 'welcome_employee' } 
            });
          } else {
            this.loginForm.setErrors({ invalidPermissions: true });
          }
        } else if (contribuyenteResult) {      
          this.router.navigate(['/inicio/taxpayer'], { 
            queryParams: { message: 'welcome_taxpayer' } 
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

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }
}
