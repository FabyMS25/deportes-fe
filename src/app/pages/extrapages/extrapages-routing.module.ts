import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FaqsComponent } from 'src/app/shared/extraspages/faqs/faqs.component';
import { ExtraPagesComponent } from './extra-pages-in/extra-pages-layout.component';
import { SearchResultsComponent } from './search-results/search-results.component';
import { SitemapComponent } from './sitemap/sitemap.component';

const routes: Routes = [
  {
    path: 'faqs',
    component: FaqsComponent
  },
  {
    path: 'privacy-policy-in',
    component: ExtraPagesComponent,
    data: { pageType: 'privacyPolicy', title: 'Política de Privacidad', requiredPermission: 'CAN_ACCESS' }
  },
  {
    path: 'terms-condition-in',
    component: ExtraPagesComponent,
    data: { pageType: 'termsConditions', title: 'Términos y Condiciones de Uso', requiredPermission: 'CAN_ACCESS' }
  },
  {
    path: 'sitemap',
    component: SitemapComponent
  },
  {
    path: 'search-results',
    component: SearchResultsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExtraPagesRoutingModule { }
