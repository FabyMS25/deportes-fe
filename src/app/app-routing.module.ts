import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './core/guards/auth.guard';
import { NoAuthGuard } from './core/guards/non-auth.guard';
import { LayoutComponent } from './layouts/layout.component';

const routes: Routes = [
  {
    path: 'public',
    loadChildren: () => import('./public/extrapages/extraspages.module')
      .then(module => module.ExtraspagesModule)
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      {
        path: 'inicio',
        loadChildren: () => import('./pages/dashboards/dashboards.module')
          .then(module => module.DashboardsModule)
      },
      {
        path: 'reports',
        loadChildren: () => import('./pages/modules/reports/reports.module')
          .then(module => module.ReportsModule)
      },
      {
        path: 'pages',
        data: { requiredPermission: 'CAN_ACCESS' },
        loadChildren: () => import('./pages/extrapages/extraspages.module')
          .then(module => module.ExtraspagesModule)
      },
      {
        path: '',
        loadChildren: () => import('./pages/pages.module')
          .then(module => module.PagesModule)
      }
    ]
  },
  {
    path: 'auth',
    canActivate: [NoAuthGuard],
    loadChildren: () => import('./public/account/account.module')
      .then(module => module.AccountModule)
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
