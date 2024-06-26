import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule , DatePipe} from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule, NgbTypeaheadModule, NgbTooltipModule, NgbDropdownModule, NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';

// Flat Picker
import { FlatpickrModule } from 'angularx-flatpickr';

// Ng Select
import { NgSelectModule } from '@ng-select/ng-select';

// Load Icons
import { defineElement } from "@lordicon/element";
import lottie from 'lottie-web';

// Component pages
import { SettingsRoutingModule } from './settings-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { EmployeesComponent } from './empleados/employees.component';
import { DeportesComponent } from './categories/deportes.component';
import { SortByCrmPipe } from "../settings/sort-by.pipe";

import { FieldsComponent } from './fields/fields.component';
import { ModalComponent } from './fields/modal/modal.component';
import { ModalEmployeeComponent } from './empleados/modal/modalEmployee.component';

@NgModule({
  declarations: [
    EmployeesComponent,
    FieldsComponent,
    DeportesComponent,
    SortByCrmPipe,
    ModalComponent,
    ModalEmployeeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbPaginationModule,
    NgbTypeaheadModule,
    NgbTooltipModule,
    NgbDropdownModule,
    NgbAccordionModule,
    FlatpickrModule,
    NgSelectModule,
    SettingsRoutingModule,
    SharedModule
  ],
  providers: [
    DatePipe
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SettingsModule {
  constructor() {
    defineElement(lottie.loadAnimation);
  }
 }
