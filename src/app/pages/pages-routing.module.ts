import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Component pages
import { DashboardComponent } from "./dashboards/dashboard/dashboard.component";
import { DetailsComponent } from './details/details.component';

const routes: Routes = [
    {
      path: '', loadChildren: () => import('./dashboards/dashboards.module').then(m => m.DashboardsModule)
    },
    {
      path: 'profile', loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule)
    },
    {
      path: 'settings', loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule)
    },
    {
      path: 'reservations', loadChildren: () => import('./reservas/reservas.module').then(m => m.ReservasModule)
    },
    {
      path: 'taxpayers', loadChildren: () => import('./taxpayers/taxpayers.module').then(m => m.TaxpayersModule)
    },
    {
      path: "reservations/details",
      component: DetailsComponent
    },


    {
      path: 'invoices', loadChildren: () => import('./invoices/invoices.module').then(m => m.InvoicesModule)
    },
    {
      path: 'pages', loadChildren: () => import('./extrapages/extraspages.module').then(m => m.ExtraspagesModule)
    },
    {
      path: 'charts', loadChildren: () => import('./charts/charts.module').then(m => m.ChartsModule)
    },
    {
      path: 'marletplace', loadChildren: () => import('./nft-marketplace/nft-marketplace.module').then(m => m.NftMarketplaceModule)
    },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
