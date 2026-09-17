import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';
import { FlatpickrModule } from 'angularx-flatpickr';
import { NgbDropdownModule, NgbTooltipModule, NgbPaginationModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { defineElement } from "@lordicon/element";
import { ScrollToModule } from '@nicky-lenaers/ngx-scroll-to';
import lottie from 'lottie-web';

import { SharedModule } from 'src/app/shared/shared.module';
import { ReportsRoutingModule } from './reports-routing.module';
import { PaymentsCompoment } from './payments/payments.component';
import { ListReportComponent } from './lists/reports.component';

@NgModule({
  declarations: [
    PaymentsCompoment,
    ListReportComponent
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
    FlatpickrModule.forRoot(),    
    FeatherModule.pick(allIcons),
    ScrollToModule.forRoot(),
    ReportsRoutingModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ReportsModule {
  constructor() {
    defineElement(lottie.loadAnimation);
  }
}
