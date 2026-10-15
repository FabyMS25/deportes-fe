import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

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
  APP_NAME = GlobalComponent.DISPLAY_NAME;

  submitted = false;
  loginForm!: UntypedFormGroup;
  fieldTextType!: boolean;
  
  isCheckingConnection: boolean = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private translate: TranslateService,
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
      username: [this.storageService.getRememberedUsername(), Validators.required],
      password: ["", Validators.required],
      rememberMe: [this.storageService.isRememberMe()]
    });
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
      this.errorMessage = result.message || this.translate.instant('LOGIN_UI.FAILED');
      this.loginForm.patchValue({ password: '' });
      return;
    }
    this.errorMessage = '';
    this.router.navigate([result.redirect!]);
  }

  get form() {
    return this.loginForm.controls;
  }

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }
}
