import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '../core/guards/auth.guard';
import { TicketComponent } from './reports/ticket/ticket.component';
import { BookingRecurrentComponent } from './booking-recurrent/list/booking-recurrent.component';
import { BookingOneTimeComponent } from './booking-one-time/list/booking-one-time.component';
import { BookingDetailsComponent } from './booking/booking-details.component';
import { OrganizationsComponent } from './organizations/organizations.component';
import { EmployeesComponent } from './settings/employees/employees.component';
import { FacilitiesComponent } from './settings/facilities/list/facilities.component';
import { FieldsComponent } from './settings/fields/list/fields.component';
import { CategoriesComponent } from './settings/categories/categories.component';
import { SurfacesComponent } from './settings/surfaces/surfaces.component';
import { ClasificadoresRuatComponent } from './settings/clasificadores-ruat/clasificadores-ruat.component';
import { SystemConfigurationsComponent } from './settings/system-configurations/system-configurations.component';
import { BookingSchoolsComponent } from './booking-schools/list/booking-schools.component';
const routes: Routes = [
    {
      path: 'inicio', loadChildren: () => import('./dashboards/dashboards.module').then(m => m.DashboardsModule), canActivate: [AuthGuard]
    },
    {
      path: 'profile', loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule)
    },
    {
      path: 'admin', 
      // loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule), 
      canActivate: [AuthGuard],
      children: [
          { path: "employees",component: EmployeesComponent},
          { path: "facilities",component: FacilitiesComponent},
          { path: "categories",component: CategoriesComponent},
          { path: "area",component: SurfacesComponent},
          { path: "classifiers",component: ClasificadoresRuatComponent},
          { path: "config",component: SystemConfigurationsComponent}     
      ]
    },
    {
      path: 'settings', 
      // loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule), 
      canActivate: [AuthGuard],
      children: [
          { path: "fields",component: FieldsComponent},      
      ]
    },
    {
      path: 'reservations',
      canActivate: [AuthGuard],
      children: [
        { path: 'one-time', component: BookingOneTimeComponent},
        { path: 'recurrent', component: BookingRecurrentComponent},
        { path: 'schools', component: BookingSchoolsComponent},
        { path: "details",  component: BookingDetailsComponent },
        { path: "ticket", component: TicketComponent },
      ]
    },
    
    {
      path: 'taxpayers', loadChildren: () => import('./taxpayers/taxpayers.module').then(m => m.TaxpayersModule), canActivate: [AuthGuard]
    },
    {
      path: 'organizations', canActivate: [AuthGuard], children:[{path:'',component:OrganizationsComponent}]
    },
    {
      path: 'reports', loadChildren: () => import('./reports/reports.module').then(m => m.ReportsModule), canActivate: [AuthGuard]
    },
    {
      path: 'pages', loadChildren: () => import('./extrapages/extraspages.module').then(m => m.ExtraspagesModule)
    },
    {
      path: '',
      redirectTo: 'inicio',
      pathMatch: 'full'
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
