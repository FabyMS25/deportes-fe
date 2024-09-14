import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlatpickrModule } from 'angularx-flatpickr';
import { NgbNavModule, NgbAccordionModule, NgbDropdownModule, NgbPaginationModule, NgbTooltipModule, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';
// Swiper Slider
import { SlickCarouselModule } from 'ngx-slick-carousel';
// Counter
import { CountUpModule } from 'ngx-countup';
import { defineElement } from '@lordicon/element';
import Lottie from 'lottie-web';

import { BreadcrumbsComponent } from './breadcrumbs/breadcrumbs.component';;
import { DataTableComponent } from './data-table/data-table.component';
import { LeafletComponent } from './map/leaflet.component';
/* extrapages stanalone */
import { TermsConditionsComponent } from './extraspages/terms-conditions/terms-conditions.component';
import { PrivacyPolicyComponent } from './extraspages/privacy-policy/privacy-policy.component';

@NgModule({
  declarations: [
    BreadcrumbsComponent,
    // ScrollspyDirective,
    // LandingScrollspyDirective,

    DataTableComponent,
    LeafletComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    CountUpModule,    
    NgbNavModule,
    NgbAccordionModule,
    NgbDropdownModule,
    SlickCarouselModule,
    NgbPaginationModule,
    
    ReactiveFormsModule,
    NgbTypeaheadModule,
    NgbTooltipModule,
    FlatpickrModule,
    NgSelectModule,
    TranslateModule,

    // NgbToastModule,
    // NgbProgressbarModule,
    // FlatpickrModule.forRoot(),
    // NgApexchartsModule,
    // SimplebarAngularModule,
    // LightboxModule,
    // FeatherModule.pick(allIcons),
    
    TermsConditionsComponent,
    PrivacyPolicyComponent
  ],
  providers: [
    DatePipe
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [BreadcrumbsComponent, 
          DataTableComponent,
          TermsConditionsComponent, PrivacyPolicyComponent
  ]
})
export class SharedModule { 
  constructor() {
    defineElement(Lottie.loadAnimation);
  }
}
