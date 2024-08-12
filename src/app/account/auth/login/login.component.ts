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

    //  constructor(
    //   private renderer: Renderer2,private formBuilder: UntypedFormBuilder,
    //   private authService: AuthenticationService,private router: Router,
    //  public toastService: ToastService) {
    //     // redirect to home if already logged in
    //     if (this.authService.isAuthenticated) {
    //       this.router.navigate(['/']);
    //     }
    //    }

  ngOnInit(): void {
    if(sessionStorage.getItem('currentUser')) {
      // this.router.navigate(['/']);
    }
    /**
     * Form Validatyion
     */
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
    // this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
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
        const loginSuccessful = await this.authenticationService.login(username, password);
        if (!loginSuccessful) {
          this.toastService.show('Inicio de sesión fallido', { classname: 'bg-danger text-white', delay: 15000 });
        }
      } else {
        this.loginForm.markAllAsTouched();
        this.toastService.show('Formulario inválido!', { classname: 'bg-warning text-dark', delay: 5000 });
      }
    } catch (error) {
      this.toastService.show("Error en la autenticación", { classname: 'bg-danger text-white', delay: 15000 });
      console.error("Error in logInSubmit:", error);
    }
  }

  /**
   * Password Hide/Show
   */
   toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

}
