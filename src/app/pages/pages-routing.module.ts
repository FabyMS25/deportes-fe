import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Component pages
import { AuthGuard } from '../core/guards/auth.guard';
import { InvoiceFormComponent } from './invoice-form/invoice-form.component';

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
      path: 'reservations', loadChildren: () => import('./reservations/reservations.module').then(m => m.ReservationsModule), canActivate: [AuthGuard]
    },
    {
      path: 'taxpayers', loadChildren: () => import('./taxpayers/taxpayers.module').then(m => m.TaxpayersModule), canActivate: [AuthGuard]
    },
    {
      path: "reservations/details", component: InvoiceFormComponent
    },
    {
      path: 'pages', loadChildren: () => import('./extrapages/extraspages.module').then(m => m.ExtraspagesModule)
    },

    
    {
      path: 'charts', loadChildren: () => import('./charts/charts.module').then(m => m.ChartsModule)
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
