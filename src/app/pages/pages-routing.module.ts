import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Component pages
import { DashboardComponent } from "./dashboards/dashboard/dashboard.component";
import { DetailsComponent } from './details/details.component';
import { AuthGuard } from '../core/guards/auth.guard';

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
      path: 'reservations', loadChildren: () => import('./reservas/reservas.module').then(m => m.ReservasModule), canActivate: [AuthGuard]
    },
    {
      path: 'taxpayers', loadChildren: () => import('./taxpayers/taxpayers.module').then(m => m.TaxpayersModule), canActivate: [AuthGuard]
    },
    {
      path: "reservations/details", component: DetailsComponent
    },
    {
      path: 'pages', loadChildren: () => import('./extrapages/extraspages.module').then(m => m.ExtraspagesModule)
    },

    
    {
      path: 'charts', loadChildren: () => import('./charts/charts.module').then(m => m.ChartsModule)
    },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
