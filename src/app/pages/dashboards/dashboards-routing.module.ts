import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './admin/dashboard.component';
import { CalendarDashboardComponent } from './calendar/calendar-dashboard.component';
import { MapDashboardComponent } from './map/map-dashboard.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'employee', component: CalendarDashboardComponent },
  { path: 'taxpayer', component: MapDashboardComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardsRoutingModule {}
