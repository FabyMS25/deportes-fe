import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../../shared/shared.module';
import { ExtraPagesRoutingModule } from './extrapages-routing.module';
import { ExtraPagesComponent } from './extra-pages-in/extra-pages-layout.component';
import { SearchResultsComponent } from './search-results/search-results.component';
import { SitemapComponent } from './sitemap/sitemap.component';
import { NgPipesModule } from 'ngx-pipes';
import { NgbDropdownModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { SlickCarouselModule } from 'ngx-slick-carousel';

@NgModule({
  declarations: [ExtraPagesComponent, SearchResultsComponent, SitemapComponent],
  imports: [
    CommonModule,
    SharedModule,
    NgPipesModule,
    NgbDropdownModule,
    NgbNavModule,
    SlickCarouselModule,
    ExtraPagesRoutingModule
  ]
})
export class ExtraspagesModule {}
