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
import { ModalComponent } from './taxpayers/modal/modal.component';

import { TicketComponent } from './reports/ticket/ticket.component';
import { BookingRecurrentComponent } from './booking-recurrent/list/booking-recurrent.component';
import { TranslateModule } from '@ngx-translate/core';
import { BookingOneTimeComponent } from './booking-one-time/list/booking-one-time.component';
import { BookingDetailsComponent } from './booking/booking-details.component';
import { ComplejoSelectionComponent } from './booking/complejo-selection/complejo-selection.component';
import { CampoSelectionComponent } from './booking/campo-selection/campo-selection.component';
import { ScheduleSelectionComponent } from './booking/schedule-selection/schedule-selection.component';
import { ReservationFormComponent } from './booking/reservation-form/reservation-form.component';
import { ScheduleRecurrentSelectionComponent } from './booking/schedule-recurrent-selection/schedule-recurrent-selection.component';
import { OrganizationsComponent } from './organizations/organizations.component';
import { EmployeesComponent } from './settings/employees/employees.component';
import { FieldsComponent } from './settings/fields/list/fields.component';
import { FacilitiesComponent } from './settings/facilities/list/facilities.component';
import { CategoriesComponent } from './settings/categories/categories.component';
import { ClasificadoresRuatComponent } from './settings/clasificadores-ruat/clasificadores-ruat.component';
import { SurfacesComponent } from './settings/surfaces/surfaces.component';
import { ModalFacilitiesComponent } from './settings/facilities/modal/modal.component';
import { ModalFieldsComponent } from './settings/fields/modal/modal.component';
import { ModalEmployeeComponent } from './settings/employees/modal/modalEmployee.component';
import { ModalScheduleComponent } from './settings/fields/modal-schedule/modal-schedule.component';
import { ModalTarifaComponent } from './settings/fields/modal-tarifa/modal-tarifa.component';
import { SystemConfigurationsComponent } from './settings/system-configurations/system-configurations.component';
import { BookingPeriodoComponent } from './booking-schools/list/booking-periodo.component';
import { BookingPeriodoModalComponent } from './booking-schools/modal/modal.component';


@NgModule({
  declarations: [
    ModalComponent,

    BookingOneTimeComponent,
    BookingRecurrentComponent,
    BookingDetailsComponent,
    BookingPeriodoComponent,
    OrganizationsComponent,

        EmployeesComponent,
        FieldsComponent,
        FacilitiesComponent,
        CategoriesComponent,
        ClasificadoresRuatComponent,
        SystemConfigurationsComponent,
        SurfacesComponent,
        ModalFacilitiesComponent,
        ModalFieldsComponent,
        ModalEmployeeComponent,
        ModalScheduleComponent,
        ModalTarifaComponent
  ],
  imports: [
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
    WidgetModule,
    TranslateModule,
    
    ComplejoSelectionComponent,
    CampoSelectionComponent,
    ScheduleRecurrentSelectionComponent,
    ScheduleSelectionComponent,
    ReservationFormComponent,
    TicketComponent,
    BookingPeriodoModalComponent,

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
