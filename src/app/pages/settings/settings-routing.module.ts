import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Component pages
import { EmployeesComponent } from "./empleados/employees.component";
import { CategoriasComponent } from "./categories/categorias.component";
import { FieldsComponent } from './fields/list/fields.component';
import { FacilitiesComponent } from './facilities/list/facilities.component';
import { AreasComponent } from './areas/areas.component';

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
    component: CategoriasComponent
  },
  {
    path: "area",
    component: AreasComponent
  }

];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SettingsRoutingModule {}
