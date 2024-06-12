import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EmpleadoComponent } from './empleado/empleado.component';
import { ContribuyenteComponent } from './contribuyente/contribuyente.component';
import { DashboardComponent } from './dashboard/dashboard.component';

// Component Pages


const routes: Routes = [
  {
      path: "",
      component: DashboardComponent
  },
  {
    path: "dashboard-employee",
    component: EmpleadoComponent
  },
  {
    path: "dashboard-taxpayer",
    component: ContribuyenteComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class DashboardsRoutingModule { }
