import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CalendarDashboardComponent } from './calendar/calendar-dashboard.component';
import { MapDashboardComponent } from './map/map-dashboard.component';
import { DashboardComponent } from './admin/dashboard.component';

// Component Pages


const routes: Routes = [
  {
    path: "",
    component: DashboardComponent
  },
  {
    path: "employee",
    component: CalendarDashboardComponent
  },
  {
    path: "taxpayer",
    component: MapDashboardComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class DashboardsRoutingModule { }
