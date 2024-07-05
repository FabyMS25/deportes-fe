import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Component pages
import { EmployeesComponent } from "./empleados/employees.component";
import { DeportesComponent } from "./categories/deportes.component";
import { FieldsComponent } from './fields/list/fields.component';
import { FacilitiesComponent } from './facilities/list/facilities.component';

const routes: Routes = [
  {
    path: "employees",
    component: EmployeesComponent
  },
  {
    path: "facilities",
    component: FacilitiesComponent
  },
  {
    path: "fields",
    component: FieldsComponent
  },
  {
    path: "categories",
    component: DeportesComponent
  }

];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SettingsRoutingModule {}
