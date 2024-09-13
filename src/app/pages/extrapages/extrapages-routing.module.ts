import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Component pages
import { FaqsComponent } from "./faqs/faqs.component";
import { ExtraPagesComponent } from './extra-pages-in/extra-pages-layout.component';

const routes: Routes = [
  {
    path: 'faqs',
    component: FaqsComponent
  },
  // {
  //   path: 'faqs',
  //   component: ExtraPagesComponent,
  //   data: { pageType: 'faqs', title: 'Frequently Asked Questions' }
  // },
  {
    path: 'privacy-policy-in',
    component: ExtraPagesComponent,
    data: { pageType: 'privacyPolicy', title: 'Política de Privacidad' }
  },
  {
    path: 'terms-condition-in',
    component: ExtraPagesComponent,
    data: { pageType: 'termsConditions', title: 'Términos & Condiciones de Uso' }
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExtraPagesRoutingModule { }
