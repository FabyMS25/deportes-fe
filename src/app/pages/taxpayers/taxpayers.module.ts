import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// Feather Icon
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';
// Flat Picker
import { FlatpickrModule } from 'angularx-flatpickr';
import { NgbDropdownModule, NgbTooltipModule, NgbPaginationModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
// Ng Select
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';
// Apex Chart Package
import { NgApexchartsModule } from 'ng-apexcharts';
// Load Icon
import { defineElement } from "@lordicon/element";
import lottie from 'lottie-web';

// Routing
import { TaxpayersRoutingModule } from './taxpayers-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
// Component
import { ListComponent } from './list/list.component';

@NgModule({
  declarations: [
    ListComponent
  ],
  imports: [
    CommonModule,
    TaxpayersRoutingModule,
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
    TranslateModule    
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TaxpayersModule {
  constructor() {
    defineElement(lottie.loadAnimation);
  }
}
