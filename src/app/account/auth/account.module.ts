import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { NgbCarouselModule, NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { NgOtpInputModule } from 'ng-otp-input';
// Load Icons
import { defineElement } from "@lordicon/element";
import lottie from 'lottie-web';

import { ToastsContainer } from './login/toasts-container.component';

import { AccountRoutingModule } from './account-routing.module';
import { LoginComponent } from './login/login.component';
import { PassResetComponent } from './pass-reset/pass-reset.component';
import { PassCreateComponent } from './pass-create/pass-create.component';
import { LogoutComponent } from './logout/logout.component';
import { SuccessMsgComponent } from './success-msg/success-msg.component';
import { TwoStepComponent } from './twostep/twostep.component';
import { SignupComponent } from './signup/signup.component';
import { SignupCheckComponent } from './signup-check/signup-check.component';

@NgModule({
  declarations: [
    LoginComponent,
    SignupComponent,
    SignupCheckComponent,
    PassResetComponent,
    PassCreateComponent,
    LogoutComponent,
    SuccessMsgComponent,
    TwoStepComponent,
    ToastsContainer
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgbCarouselModule,
    NgbToastModule,
    NgOtpInputModule,
    AccountRoutingModule,
    // SigninModule
  ],
  
  providers: [
    DatePipe,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AccountModule { 
  constructor() {
    defineElement (lottie.loadAnimation);
  }
}
