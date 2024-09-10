import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CalendarDashboardComponent } from './employee/calendar-dashboard.component';
import { MapDashboardComponent } from './taxpayer/map-dashboard.component';
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
