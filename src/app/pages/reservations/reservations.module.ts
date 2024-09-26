import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// Feather Icon
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';
// Flat Picker
import { FlatpickrModule } from 'angularx-flatpickr';
import { NgbDropdownModule, NgbTooltipModule, NgbPaginationModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
// Ng Select
import { NgSelectModule } from '@ng-select/ng-select';
// Apex Chart Package
import { NgApexchartsModule } from 'ng-apexcharts';
// Load Icon
import { defineElement } from "@lordicon/element";
import { ScrollToModule } from '@nicky-lenaers/ngx-scroll-to';
import lottie from 'lottie-web';

import { SharedModule } from 'src/app/shared/shared.module';
// Component
import { ReservationsComponent } from './list/reservations.component';
// Routing
import { ReservationsRoutingModule } from './reservations-routing.module';

import { ModalComponent } from './modal/modal.component';

@NgModule({
  declarations: [
    ReservationsComponent,
    ModalComponent
  ],
  imports: [
    SharedModule,
    TranslateModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgApexchartsModule,
    NgbDropdownModule,
    NgbTooltipModule,
    NgSelectModule,
    NgbNavModule,
    NgbPaginationModule,
    FlatpickrModule,    
    FeatherModule.pick(allIcons),
    ScrollToModule.forRoot(),
    ReservationsRoutingModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ReservationsModule {
  constructor() {
    defineElement(lottie.loadAnimation);
  }
}
