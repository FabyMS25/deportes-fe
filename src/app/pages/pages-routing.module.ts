import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Component pages
import { AuthGuard } from '../core/guards/auth.guard';
import { TicketComponent } from './invoice-form/ticket/ticket.component';
import { BookingRecurrentFormRecurrentComponent } from './booking-recurrent/form/booking-recurrent-form.component';
import { BookingRecurrentComponent } from './booking-recurrent/list/booking-recurrent.component';
import { BookingOneTimeComponent } from './booking-one-time/list/booking-one-time.component';
import { BookingDetailsComponent } from './booking/booking-details.component';
const routes: Routes = [
    {
      path: 'inicio', loadChildren: () => import('./dashboards/dashboards.module').then(m => m.DashboardsModule), canActivate: [AuthGuard]
    },
    {
      path: 'profile', loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule)
    },
    {
      path: 'settings', loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule), canActivate: [AuthGuard]
    },
    {
      path: 'reservations',
      canActivate: [AuthGuard],
      children: [
        { path: 'one-time', component: BookingOneTimeComponent},
        { path: 'recurrent', component: BookingRecurrentComponent},
        { path: 'recurrent/form', component: BookingRecurrentFormRecurrentComponent}
      ]
    },
    { path: "reservations/details",  component: BookingDetailsComponent },
    { path: "reservations/ticket", component: TicketComponent },
    // {
    //   path: 'reservations',
    //   children: [
    //     { path: "reservations/details",  component: BookingOneTimeFormComponent },
    //     { path: "reservations/ticket", component: TicketComponent },
    //   ]
    // },
    
    {
      path: 'taxpayers', loadChildren: () => import('./taxpayers/taxpayers.module').then(m => m.TaxpayersModule), canActivate: [AuthGuard]
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
