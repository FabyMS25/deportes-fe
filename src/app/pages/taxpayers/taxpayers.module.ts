import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbDropdownModule, NgbTooltipModule, NgbPaginationModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Routing
import { SharedModule } from 'src/app/shared/shared.module';

// Component
import { ListComponent } from './list/list.component';

// Apex Chart Package
import { NgApexchartsModule } from 'ng-apexcharts';

// Feather Icon
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';


// Flat Picker
import { FlatpickrModule } from 'angularx-flatpickr';

// Ng Select
import { NgSelectModule } from '@ng-select/ng-select';
// Load Icon
import { defineElement } from "@lordicon/element";
import lottie from 'lottie-web';
import { TaxpayersRoutingModule } from './taxpayers-routing.module';
import { TranslateModule } from '@ngx-translate/core';

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
