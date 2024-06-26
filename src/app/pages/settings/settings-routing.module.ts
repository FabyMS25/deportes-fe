import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Component pages
import { EmployeesComponent } from "./empleados/employees.component";
import { DeportesComponent } from "./categories/deportes.component";
import { FieldsComponent } from './fields/fields.component';

const routes: Routes = [
  {
    path: "employees",
    component: EmployeesComponent
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
