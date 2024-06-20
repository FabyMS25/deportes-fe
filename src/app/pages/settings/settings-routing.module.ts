import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Component pages
import { EmployeesComponent } from "./empleados/employees.component";
import { CompaniesComponent } from "./companies/companies.component";
import { DeportesComponent } from "./deportes/deportes.component";

const routes: Routes = [
  {
    path: "employees",
    component: EmployeesComponent
  },
  {
    path: "fields",
    component: CompaniesComponent
  },
  {
    path: "leads",
    component: DeportesComponent
  }

];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SettingsRoutingModule {}
