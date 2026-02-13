import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlatpickrModule } from 'angularx-flatpickr';
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';
import { NgbToastModule, NgbProgressbarModule,
  NgbTooltipModule, NgbNavModule, NgbCollapseModule,
  NgbPaginationModule,
  NgbAccordionModule,
  NgbModule
} from '@ng-bootstrap/ng-bootstrap';
// Counter
import { CountUpModule } from 'ngx-countup';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';
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
import { FullCalendarModule } from '@fullcalendar/angular';

import { SharedModule } from "../shared/shared.module";
import { WidgetModule } from '../shared/widget/widget.module';

import { ProfileComponent } from './account/profile/profile.component';
import { SettingsComponent } from './account/settings/settings.component';
import { PassResetComponent } from './account/password-reset/pass-reset.component';

//compoments
import { SystemConfigurationsComponent } from './modules/system-configurations/system-configurations.component';
import { ClasificadoresRuatComponent } from './modules/clasificadores-ruat/clasificadores-ruat.component';
import { FacilitiesComponent } from './modules/facilities/facilities.component';
import { FieldsComponent } from './modules/fields/fields.component';
import { CategoriesComponent } from './modules/categories/categories.component';
import { SurfacesComponent } from './modules/surfaces/surfaces.component';
import { EmployeesComponent } from './modules/employees/employees.component';
import { OrganizationsComponent } from './modules/organizations/organizations.component';
import { TaxpayersComponent } from './modules/taxpayers/taxpayers.component';

import { BookingOneTimeComponent } from './modules/booking-one-time/booking-one-time.component';
import { BookingRecurrentComponent } from './modules/booking-recurrent/booking-recurrent.component';
import { BookingPeriodoComponent } from './modules/booking-schools/booking-periodo.component';
import { BookingDetailsComponent } from './modals/booking/booking-details.component';
import { ComplejoSelectionComponent } from './modals/booking/complejo-selection/complejo-selection.component';
import { CampoSelectionComponent } from './modals/booking/campo-selection/campo-selection.component';
import { ScheduleRecurrentSelectionComponent } from './modals/booking/schedule-recurrent-selection/schedule-recurrent-selection.component';
import { ScheduleSelectionComponent } from './modals/booking/schedule-selection/schedule-selection.component';
import { ReservationFormComponent } from './modals/booking/reservation-form/reservation-form.component';
;
import { TicketComponent } from './modules/reports/ticket/ticket.component';
// import { BookingPeriodoModalComponent } from './booking-schools/modal/modal.component';

@NgModule({
  declarations: [
    ProfileComponent,
    SettingsComponent,
    PassResetComponent,

    SystemConfigurationsComponent,
    ClasificadoresRuatComponent,
    FieldsComponent,
    FacilitiesComponent,
    CategoriesComponent,
    SurfacesComponent,
    EmployeesComponent,
    OrganizationsComponent,
    TaxpayersComponent,
    
    BookingOneTimeComponent,
    BookingRecurrentComponent,
    BookingPeriodoComponent,
    BookingDetailsComponent,

        
    // ModalComponent,
    //     ModalFacilitiesComponent,
    //     ModalFieldsComponent,
    //     ModalEmployeeComponent,
    //     ModalScheduleComponent,
    //     ModalTarifaComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CountUpModule,

    LeafletModule,
    LightboxModule,
    SimplebarAngularModule,
    FeatherModule.pick(allIcons),
    NgbNavModule,
    NgbProgressbarModule,
    NgApexchartsModule,

    NgbModule,
    NgSelectModule,
    NgbDropdownModule,
    NgbToastModule,
    NgbTooltipModule,
    FullCalendarModule,
    SlickCarouselModule,
    FlatpickrModule.forRoot(),
    TranslateModule,
    WidgetModule,
    SharedModule,

    NgbPaginationModule,
    NgbToastModule,
    NgbAccordionModule,    

    ComplejoSelectionComponent,
    CampoSelectionComponent,
    ScheduleRecurrentSelectionComponent,
    ScheduleSelectionComponent,
    ReservationFormComponent,
    TicketComponent,
    
    // BookingPeriodoModalComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PagesModule { 
  constructor() {
    defineElement(lottie.loadAnimation);
  }
}
