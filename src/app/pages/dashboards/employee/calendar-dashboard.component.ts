import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CalendarOptions, EventApi, EventClickArg } from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import multiMonthPlugin from '@fullcalendar/multimonth'
import esLocale from '@fullcalendar/core/locales/es';
import Swal from 'sweetalert2';

import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { ModalComponent } from '../../reservations/modal/modal.component';
import { AuthenticationService } from 'src/app/core/services/auth.service';

@Component({
    selector: 'app-calendar-dashboard',
    templateUrl: './calendar-dashboard.component.html',
    styleUrls: ['./calendar-dashboard.component.scss']
})

export class CalendarDashboardComponent implements OnInit {

  // bread crumb items
  breadCrumbItems!: Array<{}>;
  canActivate:string[];

  // calendar
  calendarEvents!: any[];
  direction: any = 'ltr';
  selectedLocale: any = 'en';
  masterSelected: any = true;

  filterArray: any;
  filterEvents: any = [];
  allcalendarEvents: any;

  @ViewChild('confirmModal') confirmModal!: TemplateRef<any>; 

  constructor( private modalService: NgbModal,
    private reservasService: ReservaService,
    private authService: AuthenticationService,
    private router: Router
  ) { 
    this.canActivate = this.authService.hasPermission('Reservas');}

  ngOnInit(): void {
      this.breadCrumbItems = [
          { label: 'Dashboards' },
          { label: 'Encargado', active: true }
      ];        
    this._fetchData();
  }

  /**
   * Fetches the data
   */
  private _fetchData() {    
    this.reservasService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          let reservasList = data.payload;
          const assignaments= localStorage.getItem("assignaments");
          const employee = assignaments ? JSON.parse(assignaments) : null;
          if(employee){
            reservasList = data.payload.filter((item: any) => item.canchasDto.complejoDto.uuid === employee.complejoDto.uuid);
          }
          this.allcalendarEvents = reservasList;
          this.calendarEvents = this.allcalendarEvents.map(
            (evt: any) => {
              return { title: evt.canchasDto.complejoDto.nombre, 
                  // date: evt.fechaReserva, 
                  date: new Date(evt.fechaReserva), 
                  start:  `${evt.fechaReserva.split('T')[0]}T${evt.horaEntrada}`,
                  end: `${evt.fechaReserva.split('T')[0]}T${evt.horaSalida}`,
                  className: evt.className, 
                  row: evt, // ubicacion: evt.canchasDto.ubicacion, description: evt.contribuyenteDto.nombre
                }
            })
        } else {
          Swal.fire({ text: data.status, confirmButtonColor: '#299cdb' });
        }
      }
    });
  }

  /***
 * Calender Set
 */
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, listPlugin, interactionPlugin, timeGridPlugin, multiMonthPlugin],
    headerToolbar: {
      right: 'multiMonthYear,dayGridMonth,dayGridWeek,dayGridDay,listWeek',
      center: 'title',
      left: 'prev,next today'
    },
    initialView: 'dayGridMonth',
    initialEvents: this.calendarEvents,
    themeSystem: "bootstrap",
    weekends: true,
    droppable: true,
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    direction: 'ltr',
    locale: 'es',
    locales: [esLocale], 
    select: this.redirectTo.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventsSet: this.handleEvents.bind(this),
  };

  /**
   * Event click modal show
   */
  handleEventClick(clickInfo: EventClickArg) {
    const row = clickInfo.event.extendedProps['row'];
    const modalRef = this.modalService.open(ModalComponent, {
        backdrop: 'static',
        size:''
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.accion = 'show';
    modalRef.componentInstance.canActivate = this.canActivate; 
    modalRef.componentInstance.emitList.subscribe(() => {
      this._fetchData();
    });

  }

  /**
  * Events bind in calander
  * @param events events
  */
  currentEvents: EventApi[] = [];
  handleEvents(events: EventApi[]) {
    this.currentEvents = events;
  }


  changeDirection() {
    this.calendarOptions.direction = this.direction
  }
  changeLocale() {
    this.calendarOptions.locale = this.selectedLocale
  }
  checkUncheckAll(ev: any) {
    this.masterSelected = ev.target.checked;
    this.filterArray.forEach((data: any) => {
      data.checked = this.masterSelected;
    });
    if (this.masterSelected == true) {
      this.calendarEvents = this.allcalendarEvents
    } else {
      this.calendarEvents = []
    }

  }
  onCheckboxChange() {
    this.filterEvents = []
    this.filterEvents = this.allcalendarEvents.filter((event: any) => {
      return this.filterArray.some((filterItem: any) => filterItem.checked && filterItem.name === event.type);
    });
    this.calendarEvents = this.filterEvents
  }

  public redirectTo() {
    
    this.modalService.open(this.confirmModal);
    // const isConfirmed = window.confirm('¿Está seguro de realizar una reserva ese día?');
    // if (isConfirmed) {
    //   this.router.navigate(['/inicio/taxpayer']);
    // }
  }
  confirmReservation() {
    this.router.navigate(['/inicio/taxpayer']);
  }
}
