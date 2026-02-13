import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Component Pages
import { SignupComponent } from "./auth/signup/signup.component";
import { LoginComponent } from "./auth/login/login.component";
import { PassResetComponent } from './auth/pass-reset/pass-reset.component';
import { PassCreateComponent } from './auth/pass-create/pass-create.component';
import { LogoutComponent } from './auth/logout/logout.component';
import { SuccessMsgComponent } from './auth/success-msg/success-msg.component';
import { TwoStepComponent } from './auth/twostep/twostep.component';
import { SignupCheckComponent } from './auth/signup-check/signup-check.component';

const routes: Routes = [
  {
    path: 'pass-reset', component:PassResetComponent
  },
  {
    path: 'pass-create', component:PassCreateComponent
  },
  {
    path: 'logout', component: LogoutComponent
  },
  {
    path: 'success-msg', component:SuccessMsgComponent
  },
  {
    path: 'twostep', component:TwoStepComponent
  },
  {
    path: "signup-check",
    component: SignupCheckComponent
  },
  {
    path: "signup",
    component: SignupComponent
  },
  {
    path: "login",
    component: LoginComponent
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountRoutingModule { }
