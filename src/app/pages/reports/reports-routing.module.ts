import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PaymentsCompoment } from './payments/payments.component';
import { ListReportComponent } from './lists/reports.component';

const routes: Routes = [
  {
    path: "payments",
    component: PaymentsCompoment
  },
  {
    path: "list/:tipoReporte",
    component: ListReportComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportsRoutingModule { }
