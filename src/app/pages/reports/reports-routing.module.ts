import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Component pages
import { ReportsComponent } from './dates/reports.component';
import { PaymentsCompoment } from './payments/payments.component';

const routes: Routes = [
  {
    path: "dates",
    component: ReportsComponent
  },
  {
    path: "payments",
    component: PaymentsCompoment
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportsRoutingModule { }
