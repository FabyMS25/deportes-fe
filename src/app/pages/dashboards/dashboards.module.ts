import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgbAccordionModule,
  NgbCollapseModule,
  NgbProgressbarModule,
  NgbToastModule
} from '@ng-bootstrap/ng-bootstrap';
import { NgbPaginationModule, NgbTypeaheadModule, NgbDropdownModule, NgbNavModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Feather Icon
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';
import { CountUpModule } from 'ngx-countup';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { SimplebarAngularModule } from 'simplebar-angular';
// Apex Chart Package
import { NgApexchartsModule } from 'ng-apexcharts';
// Swiper Slider
import { SlickCarouselModule } from 'ngx-slick-carousel';
// Flat Picker
import { FlatpickrModule } from 'angularx-flatpickr';


//Module
import { SharedModule } from '../../shared/shared.module';
import { WidgetModule } from '../../shared/widget/widget.module';


// Component
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarDashboardComponent } from './calendar/calendar-dashboard.component';
import { MapDashboardComponent } from './map/map-dashboard.component';
import { NgPipesModule } from 'ngx-pipes';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { DndModule } from 'ngx-drag-drop';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatTableModule } from '@angular/material/table';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
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
    NgbTypeaheadModule,
    NgApexchartsModule,
    FeatherModule.pick(allIcons),
    CountUpModule,
    LeafletModule,
    NgbNavModule,
    SimplebarAngularModule,
    SlickCarouselModule,
    FlatpickrModule.forRoot(),

    SharedModule,
    WidgetModule,
    FullCalendarModule,

    
    NgbAccordionModule,
    NgbProgressbarModule,
    NgbCollapseModule,
    NgPipesModule,
    CKEditorModule,
    PickerModule,
    DndModule,
    DragDropModule,
    MatTableModule,
    NgSelectModule,
    // JobsModule,
    NgxMaskDirective, 
    NgxMaskPipe
  ]
})
export class DashboardsModule { }
