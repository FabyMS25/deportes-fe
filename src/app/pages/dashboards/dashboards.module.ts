import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgbAccordionModule,
  NgbCollapseModule,
  NgbProgressbarModule,
  NgbToastModule
} from '@ng-bootstrap/ng-bootstrap';
import { NgbPaginationModule, NgbDropdownModule, NgbNavModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Feather Icon
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';
import { CountUpModule } from 'ngx-countup';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
// Apex Chart Package
import { NgApexchartsModule } from 'ng-apexcharts';


//Module
import { SharedModule } from '../../shared/shared.module';
import { WidgetModule } from '../../shared/widget/widget.module';


// Component
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarDashboardComponent } from './calendar/calendar-dashboard.component';
import { MapDashboardComponent } from './map/map-dashboard.component';
import { NgPipesModule } from 'ngx-pipes';
import { DashboardComponent } from './admin/dashboard.component';
import { ToastsContainer } from './admin/toasts-container.component';
import { ListComponent } from './cards-row/list.component';

@NgModule({
  declarations: [
    ToastsContainer,
    DashboardComponent,
    CalendarDashboardComponent,
    MapDashboardComponent,
    ListComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbTooltipModule,
    NgbToastModule,
    NgbDropdownModule,
    NgbPaginationModule,
    NgApexchartsModule,
    FeatherModule.pick(allIcons),
    CountUpModule,
    LeafletModule,
    NgbNavModule,

    SharedModule,
    WidgetModule,
    FullCalendarModule,

    
    NgbAccordionModule,
    NgbProgressbarModule,
    NgbCollapseModule,
    NgPipesModule,
    // JobsModule,
  ]
})
export class DashboardsModule { }
