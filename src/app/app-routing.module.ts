import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './layouts/layout.component';

// Auth
import { AuthGuard } from './core/guards/auth.guard';
import { NoAuthGuard } from './core/guards/non-auth.guard';
import { ProfileComponent } from './pages/account/profile/profile.component';
import { SettingsComponent } from './pages/account/settings/settings.component';
import { FacilitiesComponent } from './pages/modules/facilities/facilities.component';
import { EmployeesComponent } from './pages/modules/employees/employees.component';
import { SurfacesComponent } from './pages/modules/surfaces/surfaces.component';
import { CategoriesComponent } from './pages/modules/categories/categories.component';
import { ClasificadoresRuatComponent } from './pages/modules/clasificadores-ruat/clasificadores-ruat.component';
import { SystemConfigurationsComponent } from './pages/modules/system-configurations/system-configurations.component';
import { FieldsComponent } from './pages/modules/fields/fields.component';
import { BookingOneTimeComponent } from './pages/modules/booking-one-time/booking-one-time.component';
import { BookingRecurrentComponent } from './pages/modules/booking-recurrent/booking-recurrent.component';
import { BookingPeriodoComponent } from './pages/modules/booking-schools/booking-periodo.component';
import { BookingDetailsComponent } from './pages/modals/booking/booking-details.component';
import { TicketComponent } from './pages/modules/reports/ticket/ticket.component';
import { TaxpayersComponent } from './pages/modules/taxpayers/taxpayers.component';
import { OrganizationsComponent } from './pages/modules/organizations/organizations.component';
import { DashboardComponent } from './pages/dashboards/admin/dashboard.component';
import { CalendarDashboardComponent } from './pages/dashboards/calendar/calendar-dashboard.component';
import { MapDashboardComponent } from './pages/dashboards/map/map-dashboard.component';

const routes: Routes = [
  {
      path: '',
      component: LayoutComponent,
      canActivate: [AuthGuard],
      canActivateChild: [AuthGuard],
      children: [
        { path: "inicio", component: DashboardComponent},
        { path: "inicio/employee", component: CalendarDashboardComponent},
        { path: "inicio/taxpayer", component: MapDashboardComponent },
        {path: 'profile/profile', component: ProfileComponent,data: { requiredPermission: 'CAN_ACCESS' },},
        {path: 'profile/profile-setting', component: SettingsComponent,data: { requiredPermission: 'CAN_ACCESS' },},
      ]
  },
  {
    path: 'admin', 
    component: LayoutComponent,
        // loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule), 
        canActivate: [AuthGuard],
        children: [
            { path: "facilities",component: FacilitiesComponent},
            { path: "employees",component: EmployeesComponent},
            { path: "area",component: SurfacesComponent},
            { path: "categories",component: CategoriesComponent},
            { path: "classifiers",component: ClasificadoresRuatComponent},
            { path: "config",component: SystemConfigurationsComponent}
        ]
  },
  {
    path: 'settings', 
    component: LayoutComponent, 
        canActivate: [AuthGuard],
        children: [
            { path: "fields",component: FieldsComponent},      
        ]
  },
  {
      path: 'reservations',
      component: LayoutComponent,
        canActivate: [AuthGuard],
        children: [
          { path: 'one-time', component: BookingOneTimeComponent},
          { path: 'recurrent', component: BookingRecurrentComponent},
          { path: 'schools', component: BookingPeriodoComponent},
          { path: "details",  component: BookingDetailsComponent},
          { path: "ticket", component: TicketComponent},
        ]
  },
      {
        path: 'taxpayers', component: LayoutComponent, canActivate: [AuthGuard], children:[{path:'',component:TaxpayersComponent}]
      },
      {
        path: 'organizations', component: LayoutComponent, canActivate: [AuthGuard], children:[{path:'',component:OrganizationsComponent}]
      },
      {
        path: 'reports', component: LayoutComponent, loadChildren: () => import('./pages/modules/reports/reports.module').then(m => m.ReportsModule), canActivate: [AuthGuard]
      },
    
  /*EXTRA PAGES  */
  {
    path: 'pages',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    data: { requiredPermission: 'CAN_ACCESS' },
    children: [
      { path: '', loadChildren: () => import('./pages/extrapages/extraspages.module').then(m => m.ExtraspagesModule), },
    ]
  },
  
  /* PUBLIC ACCES */
  // { path: 'landing', loadChildren: () => import('./public/landing/landing.module').then(m => m.LandingModule)},  
  {
    path: 'auth',
    canActivate: [NoAuthGuard], 
    loadChildren: () => import('./public/account/account.module').then(m => m.AccountModule),
  },
  { path: 'public', loadChildren: () => import('./public/extrapages/extraspages.module').then(m => m.ExtraspagesModule) },
  { path: '**', redirectTo: '' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
