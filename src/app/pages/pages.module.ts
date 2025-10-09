import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlatpickrModule } from 'angularx-flatpickr';
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';
import { NgbToastModule, NgbProgressbarModule,
  NgbTooltipModule, NgbNavModule, NgbCollapseModule,
  NgbPaginationModule,
  NgbAccordionModule
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
import { CommentsComponent } from './invoice-form/comments/comments.component';
import { ModalComponent } from './taxpayers/modal/modal.component';

import { TimeTablesComponent } from './invoice-form/timetables/timetables.component';
import { TicketComponent } from './invoice-form/ticket/ticket.component';
import { BookingRecurrentFormRecurrentComponent } from './booking-recurrent/form/booking-recurrent-form.component';
import { BookingRecurrentComponent } from './booking-recurrent/list/booking-recurrent.component';
import { TranslateModule } from '@ngx-translate/core';
import { ModalRecurrentComponent } from './booking-recurrent/modal/modal.component';
import { BookingOneTimeModalComponent } from './booking-one-time/modal/modal.component';
import { BookingOneTimeComponent } from './booking-one-time/list/booking-one-time.component';
import { BookingDetailsComponent } from './booking/booking-details.component';
import { ComplejoSelectionComponent } from './booking/complejo-selection/complejo-selection.component';
import { CampoSelectionComponent } from './booking/campo-selection/campo-selection.component';
import { ScheduleSelectionComponent } from './booking/schedule-selection/schedule-selection.component';
import { ReservationFormComponent } from './booking/reservation-form/reservation-form.component';
import { ScheduleRecurrentSelectionComponent } from './booking/schedule-recurrent-selection/schedule-recurrent-selection.component';


@NgModule({
  declarations: [
    TimeTablesComponent,
    TicketComponent,
    CommentsComponent,
    ModalComponent,

    BookingOneTimeComponent,
    BookingRecurrentComponent,
    BookingDetailsComponent,
    BookingRecurrentFormRecurrentComponent,
    BookingOneTimeModalComponent,
    ModalRecurrentComponent
  ],
  imports: [
    WidgetModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbNavModule,
    NgbCollapseModule,
    NgbToastModule,
    NgbProgressbarModule,
    NgbAccordionModule,
    CountUpModule,
    NgApexchartsModule,
    NgbDropdownModule,
    NgSelectModule,
    NgbPaginationModule,
    SimplebarAngularModule,
    PagesRoutingModule,
    SlickCarouselModule,
    LightboxModule,  
    NgbTooltipModule,
    // FlatpickrModule,
    LeafletModule,
    SharedModule,
    
    ComplejoSelectionComponent,
    CampoSelectionComponent,
    ScheduleSelectionComponent,
    ScheduleRecurrentSelectionComponent,
    ReservationFormComponent,

    TranslateModule,

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
