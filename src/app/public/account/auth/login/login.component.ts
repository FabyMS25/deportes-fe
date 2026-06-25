import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { TokenStorageService } from 'src/app/core/services/token-storage.service';
import { GlobalComponent } from 'src/app/global-component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})

export class LoginComponent implements OnInit {
  year: number = new Date().getFullYear();
  APP_NAME = GlobalComponent.NAME_APP;

  submitted = false;
  loginForm!: UntypedFormGroup;
  fieldTextType!: boolean;
  
  isCheckingConnection: boolean = false;
  errorMessage = '';
  errorType?: string;

  constructor(
    private router: Router,
    private formBuilder: UntypedFormBuilder,
    private authService: AuthenticationService,
    private storageService: TokenStorageService,
  ) {
    if (this.authService.currentUser()) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
    this.loginForm = this.formBuilder.group({
      username: ["", Validators.required],
      password: ["", Validators.required],
      rememberMe: [this.storageService.isRememberMe()]
    });
    if (this.storageService.isRememberMe()) {
      this.loginForm.patchValue({
        username: this.storageService.getUser()?.username
      });
    }
  }

  async onSubmit() {
    this.submitted = true;
    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    const { username, password, rememberMe } = this.loginForm.value;
    this.isCheckingConnection = true;
    const result = await this.authService.login(username, password, rememberMe);
    this.isCheckingConnection = false;
    if (!result.success) {
      this.errorMessage = result.message || 'Error';
      this.errorType = result.errorType;
      this.loginForm.patchValue({ password: '' });
      return;
    }
    this.errorMessage = '';
    if (result.ruatStatus === false) {
      Swal.fire({
        icon:'warning',
        title:'RUAT no disponible',
        text:'Algunas funciones estarán limitadas'
      });
    }
    this.router.navigate([result.redirect!]);
  }

  get form() {
    return this.loginForm.controls;
  }

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }
}
