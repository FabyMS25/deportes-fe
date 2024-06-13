import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NgbNavModule, NgbAccordionModule, NgbDropdownModule, NgbPaginationModule, NgbTooltipModule, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

// Swiper Slider
import { SlickCarouselModule } from 'ngx-slick-carousel';

// Counter
import { CountUpModule } from 'ngx-countup';

import { BreadcrumbsComponent } from './breadcrumbs/breadcrumbs.component';
import { ScrollspyDirective } from './scrollspy.directive';
import { LandingScrollspyDirective } from './landingscrollspy.directive';
import { DataTableComponent } from './data-table/data-table.component';
import { FlatpickrModule } from 'angularx-flatpickr';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { defineElement } from '@lordicon/element';
import Lottie from 'lottie-web';




@NgModule({
  declarations: [
    BreadcrumbsComponent,
    ScrollspyDirective,
    LandingScrollspyDirective,

    DataTableComponent,
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

    // NgbToastModule,
    // NgbProgressbarModule,
    // FlatpickrModule.forRoot(),
    // NgApexchartsModule,
    // SimplebarAngularModule,
    // LightboxModule,
    
    // FeatherModule.pick(allIcons),
  ],
  providers: [
    DatePipe
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [BreadcrumbsComponent, LandingScrollspyDirective, ScrollspyDirective,
    DataTableComponent]
})
export class SharedModule { 
  constructor() {
    defineElement(Lottie.loadAnimation);
  }
}
