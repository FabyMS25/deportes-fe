import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { NgbCarouselModule, NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { NgOtpInputModule } from 'ng-otp-input';
import { defineElement } from "@lordicon/element";
import lottie from 'lottie-web';

import { ToastsContainer } from './auth/login/toasts-container.component';

import { AccountRoutingModule } from './account-routing.module';
import { LoginComponent } from './auth/login/login.component';
import { PassResetComponent } from './auth/pass-reset/pass-reset.component';
import { PassCreateComponent } from './auth/pass-create/pass-create.component';
import { LogoutComponent } from './auth/logout/logout.component';
import { SuccessMsgComponent } from './auth/success-msg/success-msg.component';
import { TwoStepComponent } from './auth/twostep/twostep.component';
import { SignupComponent } from './auth/signup/signup.component';
import { SignupCheckComponent } from './auth/signup-check/signup-check.component';

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
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    NgbCarouselModule,
    NgbToastModule,
    NgOtpInputModule,
    AccountRoutingModule,
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
