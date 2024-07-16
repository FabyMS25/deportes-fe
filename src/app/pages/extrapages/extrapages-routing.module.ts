import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Component pages
import { FaqsComponent } from "./faqs/faqs.component";
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { TermsConditionComponent } from './terms-condition/terms-condition.component';

const routes: Routes = [
  {
    path: 'faqs',
    component: FaqsComponent
  },
  {
    path: 'privacy-policy-in',
    component: PrivacyPolicyComponent
  },
  {
    path: 'terms-condition-in',
    component: TermsConditionComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExtraPagesRoutingModule { }
