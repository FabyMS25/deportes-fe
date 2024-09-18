import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Component pages
import { EmployeesComponent } from "./employees/employees.component";
import { CategoriesComponent } from "./categories/categories.component";
import { FieldsComponent } from './fields/list/fields.component';
import { FacilitiesComponent } from './facilities/list/facilities.component';
import { SurfacesComponent } from './surfaces/surfaces.component';

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
    component: CategoriesComponent
  },
  {
    path: "area",
    component: SurfacesComponent
  }

];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SettingsRoutingModule {}
