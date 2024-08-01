import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { CalendarOptions, EventApi, EventClickArg, EventInput } from '@fullcalendar/core';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import multiMonthPlugin from '@fullcalendar/multimonth'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';


import esLocale from '@fullcalendar/core/locales/es';

import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { ModalComponent } from '../../reservas/modal/modal.component';
@Component({
    selector: 'app-empleado',
    templateUrl: './empleado.component.html',
    styleUrls: ['./empleado.component.scss']
})

export class EmpleadoComponent implements OnInit {

  // bread crumb items
  breadCrumbItems!: Array<{}>;

  // calendar
  calendarEvents!: EventInput[];
  direction: any = 'ltr';
  selectedLocale: any = 'en';
  masterSelected: any = true;
  // category: any
  // events$: Observable<EventInput[]>;

  filterArray: any;
  filterEvents: any = [];
  allcalendarEvents: any;

  constructor( private modalService: NgbModal,
    private reservasService: ReservaService
  ) { }

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
          const reservasList = data.payload;
          this.allcalendarEvents = data.payload;
          this.calendarEvents = reservasList.map(
            (evt: any) => {
              return { title: evt.canchasDto.complejoDto.nombre, 
                  date: evt.fechaReserva, 
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
    select: this.openModal.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventsSet: this.handleEvents.bind(this),
  };

  openModal(events?: any) {
    console.log(events)
    const modalRef = this.modalService.open(ModalComponent, {
        backdrop: 'static',
        size:''
    });
    modalRef.componentInstance.row = undefined;
    modalRef.componentInstance.accion = '';
    modalRef.componentInstance.listaItems.subscribe(() => {
      this._fetchData();
    });
  }

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
    modalRef.componentInstance.listaItems.subscribe(() => {
      this._fetchData();
    });

  }


  /**
  * Events bind in calander
  * @param events events
  */
  handleEvents(events: EventApi[]) {
    this.currentEvents = events;
  }

  currentEvents: EventApi[] = [];

  // Calender direction functionality
  changeDirection() {
    this.calendarOptions.direction = this.direction
  }

  // Calender langulage functionality
  changeLocale() {
    this.calendarOptions.locale = this.selectedLocale
  }

  // Calender filter functionality
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

}
