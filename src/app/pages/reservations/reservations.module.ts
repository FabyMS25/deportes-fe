import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbDropdownModule, NgbTooltipModule, NgbPaginationModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Routing
import { ReservationsRoutingModule } from './reservations-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';

// Component
import { ReservationsComponent } from './list/reservations.component';

// Apex Chart Package
import { NgApexchartsModule } from 'ng-apexcharts';

// Feather Icon
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';

import { ScrollToModule } from '@nicky-lenaers/ngx-scroll-to';

// Flat Picker
import { FlatpickrModule } from 'angularx-flatpickr';

// Ng Select
import { NgSelectModule } from '@ng-select/ng-select';
// Load Icon
import { defineElement } from "@lordicon/element";
import lottie from 'lottie-web';
import { ModalComponent } from './modal/modal.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    ReservationsComponent,
    ModalComponent
  ],
  imports: [
    CommonModule,
    ReservationsRoutingModule,
    SharedModule,
    NgApexchartsModule,
    FeatherModule.pick(allIcons),
    NgbDropdownModule,
    NgbTooltipModule,
    FormsModule,
    ReactiveFormsModule,
    FlatpickrModule,
    NgSelectModule,
    NgbPaginationModule,
    NgbNavModule,
    ScrollToModule.forRoot(),
    TranslateModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ReservationsModule {
  constructor() {
    defineElement(lottie.loadAnimation);
  }
}
