import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BasicComponent } from "./basic/basic.component";
import { AltComponent } from "./alt/alt.component";
import { Page500Component } from "./page500/page500.component";
import { OfflineComponent } from "./offline/offline.component";

const routes: Routes = [
  {
    path:"404-basic",
    component: BasicComponent
  },
  {
    path: "404-alt",
    component: AltComponent
  },
  {
    path: "page-500",
    component: Page500Component
  },
  {
    path: "offline",
    component: OfflineComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Error404RoutingModule { }
