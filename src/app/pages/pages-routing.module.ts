import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ProfileComponent } from './account/profile/profile.component';
import { SettingsComponent } from './account/settings/settings.component';
import { BookingDetailsComponent } from './modals/booking/booking-details.component';
import { BookingOneTimeComponent } from './modules/booking-one-time/booking-one-time.component';
import { BookingRecurrentComponent } from './modules/booking-recurrent/booking-recurrent.component';
import { BookingPeriodoComponent } from './modules/booking-schools/booking-periodo.component';
import { CategoriesComponent } from './modules/categories/categories.component';
import { ClasificadoresRuatComponent } from './modules/clasificadores-ruat/clasificadores-ruat.component';
import { EmployeesComponent } from './modules/employees/employees.component';
import { FacilitiesComponent } from './modules/facilities/facilities.component';
import { FieldsComponent } from './modules/fields/fields.component';
import { OrganizationsComponent } from './modules/organizations/organizations.component';
import { SurfacesComponent } from './modules/surfaces/surfaces.component';
import { SystemConfigurationsComponent } from './modules/system-configurations/system-configurations.component';
import { TaxpayersComponent } from './modules/taxpayers/taxpayers.component';
import { TicketComponent } from './modules/reports/ticket/ticket.component';

const routes: Routes = [
  { path: 'profile/profile', component: ProfileComponent, data: { requiredPermission: 'CAN_ACCESS' } },
  { path: 'profile/profile-setting', component: SettingsComponent, data: { requiredPermission: 'CAN_ACCESS' } },
  { path: 'admin/facilities', component: FacilitiesComponent },
  { path: 'admin/employees', component: EmployeesComponent },
  { path: 'admin/area', component: SurfacesComponent },
  { path: 'admin/categories', component: CategoriesComponent },
  { path: 'admin/classifiers', component: ClasificadoresRuatComponent },
  { path: 'admin/config', component: SystemConfigurationsComponent },
  { path: 'settings/fields', component: FieldsComponent },
  { path: 'reservations/one-time', component: BookingOneTimeComponent },
  { path: 'reservations/recurrent', component: BookingRecurrentComponent },
  { path: 'reservations/schools', component: BookingPeriodoComponent },
  { path: 'reservations/details', component: BookingDetailsComponent },
  { path: 'reservations/ticket', component: TicketComponent },
  { path: 'taxpayers', component: TaxpayersComponent },
  { path: 'organizations', component: OrganizationsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule {}
