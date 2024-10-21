import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlatpickrModule } from 'angularx-flatpickr';
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';
import { NgbToastModule, NgbProgressbarModule,
  NgbTooltipModule, NgbNavModule, NgbCollapseModule
} from '@ng-bootstrap/ng-bootstrap';
// Counter
import { CountUpModule } from 'ngx-countup';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
// Scrollto
import { ScrollToModule } from '@nicky-lenaers/ngx-scroll-to';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { SimplebarAngularModule } from 'simplebar-angular';
// Swiper Slider
import { SlickCarouselModule } from 'ngx-slick-carousel';
import { LightboxModule } from 'ngx-lightbox';
// Load Icons
import { defineElement } from "@lordicon/element";
import lottie from 'lottie-web';

import { SharedModule } from "../shared/shared.module";
import { WidgetModule } from '../shared/widget/widget.module';
// Pages Routing
import { PagesRoutingModule } from "./pages-routing.module";
//compoments
import { InvoiceFormComponent } from './invoice-form/invoice/invoice-form.component';
import { CommentsComponent } from './invoice-form/comments/comments.component';
import { ModalComponent } from './taxpayers/modal/modal.component';

import { TimeTablesComponent } from './invoice-form/timetables/timetables.component';
import { TicketComponent } from './invoice-form/ticket/ticket.component';
import { DetailsComponent } from './invoice-form/details/details.component';


@NgModule({
  declarations: [
    TimeTablesComponent,
    InvoiceFormComponent,
    DetailsComponent,
    TicketComponent,
    CommentsComponent,
    ModalComponent
  ],
  imports: [
    SharedModule,
    WidgetModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbNavModule,
    NgbCollapseModule,
    NgbToastModule,
    NgbProgressbarModule,
    CountUpModule,
    NgApexchartsModule,
    NgbDropdownModule,
    NgSelectModule,
    // NgbPaginationModule,
    SimplebarAngularModule,
    PagesRoutingModule,
    SlickCarouselModule,
    LightboxModule,  
    NgbTooltipModule,
    // FlatpickrModule,
    LeafletModule,
    ScrollToModule.forRoot(),
    FeatherModule.pick(allIcons),
    FlatpickrModule.forRoot(),
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PagesModule { 
  constructor() {
    defineElement(lottie.loadAnimation);
  }
}
