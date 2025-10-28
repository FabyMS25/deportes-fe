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
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { BookingOneTimeModalComponent } from '../../booking-one-time/modal/modal.component';
import { Reserva } from 'src/app/core/models/reserva.models';
import { ReservaPuntualService } from 'src/app/core/services/api/reserva-puntual.service';
import { ReservaRecurrenteService } from 'src/app/core/services/api/reserva-recurrente.service';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { ModalRecurrentComponent } from '../../booking-recurrent/modal/modal.component';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ReservaPuntual } from 'src/app/core/models/reservaPuntual.models';
import { EstadoReserva } from 'src/app/core/constants/Estados';

@Component({
    selector: 'app-calendar-dashboard',
    templateUrl: './calendar-dashboard.component.html',
    styleUrls: ['./calendar-dashboard.component.scss']
})

export class CalendarDashboardComponent implements OnInit {
  breadCrumbItems!: Array<{}>;
  canActivate:string[];

  calendarEvents: any[] = [];
  upcomingEvents: any[] = [];
  direction: any = 'ltr';
  selectedLocale: any = 'es';
  masterSelected: any = true;
  showFilters: boolean = true;

  filterArray: any = [
    { name: 'reserva-puntual', label: 'Reservas Puntuales', checked: true, color: '#10b981' },
    { name: 'reserva-recurrente', label: 'Reservas Recurrentes', checked: true, color: '#3b82f6' },
    { name: 'excepcion', label: 'Excepciones (Cerrado/Mantenimiento/Eventos)', checked: true, color: '#ef4444' }
  ];
  
  filterEvents: any = [];
  allcalendarEvents: any[] = [];
  contribuyente!:Contribuyente;

  @ViewChild('confirmModal') confirmModal!: TemplateRef<any>; 

  constructor( 
    private modalService: NgbModal,
    private campoDeportivoService: CamposDeportivoService,
    private reservasService: ReservaService,
    private reservaPuntualService: ReservaPuntualService,
    private reservaRecurrenteService: ReservaRecurrenteService,
    private authService: AuthenticationService,
    private router: Router
  ) { 
    this.canActivate = this.authService.hasPermission('Reservas');
  }

  ngOnInit(): void {
      this.breadCrumbItems = [
          { label: 'Dashboards' },
          { label: 'Encargado', active: true }
      ];  
      const currentUser = window.sessionStorage.getItem("currentUser");
      if (window.sessionStorage.getItem("auth-token") === 'isContribuyente') {
        this.contribuyente = currentUser ? JSON.parse(currentUser) : null;
      }   
    this._fetchData();
  }

  private async _fetchData() {    
    try {
      const [reservasPuntuales, reservasRecurrentes, camposDeportivos] = await Promise.all([
        this.reservasService.getByTipo('puntual').toPromise(),
        this.reservasService.getByTipo('recurrente').toPromise(),
        this.campoDeportivoService.getAll().toPromise()
      ]);

      const assignaments = localStorage.getItem("assignaments");
      const employee = assignaments ? JSON.parse(assignaments) : null;
      
      let allEvents: any[] = [];

      if (reservasPuntuales?.status === 'OK') {
        let reservasPuntualesData = reservasPuntuales.payload.filter((item:Reserva)=>
          item.estadoReserva === EstadoReserva.PAGADA || 
          item.estadoReserva === EstadoReserva.PENDIENTE || item.estadoReserva===EstadoReserva.SOLICITADA ||
          item.estadoReserva === EstadoReserva.COMPLETADA || item.estadoReserva===EstadoReserva.EN_CURSO
        );
        
        if (employee) {
          reservasPuntualesData = reservasPuntualesData.filter((item: Reserva) => 
            item.campoDeportivoDto?.complejoDto?.uuid === employee.complejoDto.uuid
          );
        }
        if(this.contribuyente){
          reservasPuntualesData = reservasPuntualesData.filter((item: Reserva) => 
            item.contribuyenteDto?.uuid === this.contribuyente.uuid
          );
        }

        const eventosPuntuales = reservasPuntualesData.map((evt: any) => {
          const reservaPuntual = evt.reservaPuntualDto;
          const fechaBase = reservaPuntual?.fechaUso || evt.fechaReserva;
          const horaEntrada = reservaPuntual?.horaInicio;
          const horaSalida = reservaPuntual?.horaFin;
          
          if (!horaEntrada || !horaSalida) {
            return null;
          }

          const startTime = this.formatTime(horaEntrada);
          const endTime = this.formatTime(horaSalida);
          const campoNombre = evt.campoDeportivoDto?.nombre || 'Campo';
          const complejoNombre = evt.campoDeportivoDto?.complejoDto?.nombre || 'Complejo';

          return {
            id: `puntual-${evt.uuid}`,
            title: `${startTime}-${endTime} | ${campoNombre}`,
            start: `${fechaBase.split('T')[0]}T${horaEntrada}`,
            end: `${fechaBase.split('T')[0]}T${horaSalida}`,
            backgroundColor: '#10b981',
            borderColor: '#059669',
            textColor: '#fff',
            extendedProps: {
              type: 'reserva-puntual',
              row: evt,
              description: evt.contribuyenteDto?.nombre || 'Cliente',
              complejo: complejoNombre,
              campo: campoNombre,
              horaInicio: startTime,
              horaFin: endTime
            }
          };
        }).filter((event: any) => event !== null);
        
        allEvents = [...allEvents, ...eventosPuntuales];
      }

      if (reservasRecurrentes?.status === 'OK') {
        let reservasRecurrentesData = reservasRecurrentes.payload.filter((item:Reserva)=>
          item.estadoReserva === EstadoReserva.PAGADA || 
          item.estadoReserva === EstadoReserva.PENDIENTE || item.estadoReserva===EstadoReserva.SOLICITADA ||
          item.estadoReserva === EstadoReserva.COMPLETADA || item.estadoReserva===EstadoReserva.EN_CURSO
        );
        
        if (employee) {
          reservasRecurrentesData = reservasRecurrentesData.filter((item: any) => 
            item.campoDeportivoDto?.complejoDto?.uuid === employee.complejoDto.uuid
          );
        }
        if(this.contribuyente){
          reservasRecurrentesData = reservasRecurrentesData.filter((item: Reserva) => 
            item.contribuyenteDto?.uuid === this.contribuyente.uuid
          );
        }

        const eventosRecurrentes = this.generateRecurringEvents(reservasRecurrentesData);
        allEvents = [...allEvents, ...eventosRecurrentes];
      }

      if (camposDeportivos?.status === 'OK') {
        let camposDeportivosData = camposDeportivos.payload;
        let horariosExcepcion: any[] = [];
        
        camposDeportivosData.forEach((campo: any) => {
          if (campo.horariosExcepcionesDtoList && Array.isArray(campo.horariosExcepcionesDtoList)) {
            const exceptionsWithCampo = campo.horariosExcepcionesDtoList.map((exc: any) => ({
              ...exc,
              campoDeportivoDto: campo
            }));
            horariosExcepcion = [...horariosExcepcion, ...exceptionsWithCampo];
          }
        });

        if (employee) {
          horariosExcepcion = horariosExcepcion.filter((exc: any) => 
            exc.campoDeportivoDto?.complejoDto?.uuid === employee.complejoDto.uuid
          );
        }

        const eventosExcepcion = horariosExcepcion.map((exc: any) => {
          let backgroundColor = '#059669';
          let borderColor = '#dc2626';
          let title = 'CERRADO';
          
          const tipoExcepcion = (exc.tipoExcepcion || '').toUpperCase();
          
          if (tipoExcepcion.includes('MANTENIMIENTO')) {
            backgroundColor = '#f59e0b';
            borderColor = '#d97706';
            title = 'MANTENIMIENTO';
          } else if (tipoExcepcion.includes('EVENTO') || tipoExcepcion.includes('MUNICIPAL')) {
            backgroundColor = '#8b5cf6';
            borderColor = '#7c3aed';
            title = 'EVENTO MUNICIPAL';
          } else if (tipoExcepcion.includes('ESPECIAL')) {
            backgroundColor = '#06b6d4';
            borderColor = '#0891b2';
            title = 'HORARIO ESPECIAL';
          }

          const horaInicio = exc.horaApertura || '00:00:00';
          const horaFin = exc.horaCierre || '23:59:59';
          const startTime = this.formatTime(horaInicio);
          const endTime = this.formatTime(horaFin);
          const campoNombre = exc.campoDeportivoDto?.nombre || 'Campo';
          const complejoNombre = exc.campoDeportivoDto?.complejoDto?.nombre || 'Complejo';

          return {
            id: `excepcion-${exc.uuid}`,
            title: `${startTime}-${endTime} | ${campoNombre} - ${title}`,
            start: `${exc.fecha.split('T')[0]}T${horaInicio}`,
            end: `${exc.fecha.split('T')[0]}T${horaFin}`,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            textColor: '#fff',
            extendedProps: {
              type: 'excepcion',
              row: exc,
              motivo: exc.motivo || 'Sin motivo especificado',
              tipoExcepcion: title,
              campo: campoNombre,
              complejo: complejoNombre,
              horaInicio: startTime,
              horaFin: endTime
            }
          };
        });
        
        allEvents = [...allEvents, ...eventosExcepcion];
      }

      this.allcalendarEvents = allEvents;
      this.calendarEvents = allEvents;
      this.updateUpcomingEvents();
      
      this.calendarOptions.events = this.calendarEvents;
      
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los eventos del calendario'
      });
    }
  }

  /**
   * Format time from HH:mm:ss to HH:mm
   */
  private formatTime(time: string): string {
    if (!time) return '';
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  }

  /**
   * Update upcoming events list (next 10 events sorted by date)
   */
  private updateUpcomingEvents() {
    const now = new Date();
    this.upcomingEvents = [...this.calendarEvents]
      .filter(event => new Date(event.start) >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 10);
  }

  /**
   * Generate individual events from recurring reservations
   */
  private generateRecurringEvents(reservasRecurrentes: any[]): any[] {
    const events: any[] = [];
    
    reservasRecurrentes.forEach((reserva: any) => {
      const reservaRecurrente = reserva.reservaRecurrenteDto;
      const fechaInicio = new Date(reservaRecurrente?.fechaInicio);
      const fechaFin = new Date(reservaRecurrente?.fechaFin);
      
      let diasSemanaStr = reservaRecurrente?.diasSemana || '';
      let diasArray: string[] = [];
      
      if (diasSemanaStr) {
        diasArray = diasSemanaStr.split(',').map((dia:any) => dia.trim().toUpperCase());
      }
      
      const dayMap: any = {
        'DOMINGO': 0, 'LUNES': 1, 'MARTES': 2, 'MIERCOLES': 3, 'MIÉRCOLES': 3,
        'JUEVES': 4, 'VIERNES': 5, 'SABADO': 6, 'SÁBADO': 6
      };
      
      const daysToGenerate = diasArray.map((dia: string) => dayMap[dia]).filter(day => day !== undefined);
      
      let horaEntrada = '08:00:00';
      let horaSalida = '09:00:00';
      
      if (reservaRecurrente?.tableroDto?.horario) {
        const horario = reservaRecurrente.tableroDto.horario;
        const firstTimeSlot = horario.find((slot: any) => slot && slot.length >= 2);
        if (firstTimeSlot && firstTimeSlot[1]) {
          const [start, end] = firstTimeSlot[1].split('-');
          horaEntrada = start;
          horaSalida = end;
        }
      }
      
      if (!horaEntrada || !horaSalida) {
        return;
      }

      const startTime = this.formatTime(horaEntrada);
      const endTime = this.formatTime(horaSalida);
      const campoNombre = reserva.campoDeportivoDto?.nombre || 'Campo';
      const complejoNombre = reserva.campoDeportivoDto?.complejoDto?.nombre || 'Complejo';
      
      let currentDate = new Date(fechaInicio);
      while (currentDate <= fechaFin) {
        if (daysToGenerate.length === 0 || daysToGenerate.includes(currentDate.getDay())) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          events.push({
            id: `recurrente-${reserva.uuid}-${dateStr}`,
            title: `${startTime}-${endTime} | ${campoNombre} (R)`,
            start: `${dateStr}T${horaEntrada}`,
            end: `${dateStr}T${horaSalida}`,
            backgroundColor: '#3b82f6',
            borderColor: '#2563eb',
            textColor: '#fff',
            extendedProps: {
              type: 'reserva-recurrente',
              row: reserva,
              description: reserva.contribuyenteDto?.nombre || 'Cliente',
              complejo: complejoNombre,
              campo: campoNombre,
              horaInicio: startTime,
              horaFin: endTime
            }
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    return events;
  }

  /**
   * Calendar configuration
   */
calendarOptions: CalendarOptions = {
  plugins: [dayGridPlugin, listPlugin, interactionPlugin, timeGridPlugin, multiMonthPlugin],
  headerToolbar: {
    right: 'multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    center: 'title',
    left: 'prev,next today'
  },
  initialView: 'dayGridMonth',
  themeSystem: "bootstrap",
  weekends: true,
  droppable: false,
  editable: false,
  selectable: true,
  selectMirror: true,
  dayMaxEvents: 3,
  dayMaxEventRows: 3,
  dayPopoverFormat: { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  },
  moreLinkClick: 'popover',
  moreLinkContent: (args) => {
    return `+${args.num} más`;
  },
  direction: 'ltr',
  locale: 'es',
  locales: [esLocale],
  slotMinTime: '06:00:00',
  slotMaxTime: '23:00:00',
  allDaySlot: false,
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  eventDisplay: 'block', 
  eventColor: '#3788d8', 
  eventTextColor: '#ffffff',
  eventBackgroundColor: '#3788d8',
  eventBorderColor: '#3788d8',
  
  select: this.redirectTo.bind(this),
  eventClick: this.handleEventClick.bind(this),
  eventsSet: this.handleEvents.bind(this),
};

  /**
   * Event click modal show
   */
  handleEventClick(clickInfo: EventClickArg) {
    const eventType = clickInfo.event.extendedProps['type'];
    const row: Reserva = clickInfo.event.extendedProps['row'];
    
    if (eventType === 'excepcion') {
      const tipoExcepcion = clickInfo.event.extendedProps['tipoExcepcion'];
      const motivo = clickInfo.event.extendedProps['motivo'];
      const campo = clickInfo.event.extendedProps['campo'];
      const complejo = clickInfo.event.extendedProps['complejo'];
      const horaInicio = clickInfo.event.extendedProps['horaInicio'];
      const horaFin = clickInfo.event.extendedProps['horaFin'];
      
      Swal.fire({
        title: tipoExcepcion || 'Excepción',
        html: `
          <div class="text-start">
            <p><strong>Complejo:</strong> ${complejo || 'N/A'}</p>
            <p><strong>Campo:</strong> ${campo || 'N/A'}</p>
            <p><strong>Horario:</strong> ${horaInicio} - ${horaFin}</p>
            <p><strong>Fecha:</strong> ${clickInfo.event.start?.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p><strong>Motivo:</strong> ${motivo}</p>
          </div>
        `,
        icon: 'info',
        confirmButtonText: 'Cerrar'
      });
    } else {
      if(row.tipoReserva === 'puntual'){
        this.opemModalReservationPuntual(row)
      }else{
        this.opemModalReservationRecurrente(row)
      }
    }
  }

  /**
   * Handle click on upcoming event card
   */
  handleUpcomingEventClick(event: any) {
    const eventType = event.extendedProps?.type;
    const row: Reserva = event.extendedProps?.row;
    
    if (eventType === 'excepcion') {
      const tipoExcepcion = event.extendedProps?.tipoExcepcion;
      const motivo = event.extendedProps?.motivo;
      const campo = event.extendedProps?.campo;
      const complejo = event.extendedProps?.complejo;
      const horaInicio = event.extendedProps?.horaInicio;
      const horaFin = event.extendedProps?.horaFin;
      const eventDate = new Date(event.start);
      
      Swal.fire({
        title: tipoExcepcion || 'Excepción',
        html: `
          <div class="text-start">
            <p><strong>Complejo:</strong> ${complejo || 'N/A'}</p>
            <p><strong>Campo:</strong> ${campo || 'N/A'}</p>
            <p><strong>Horario:</strong> ${horaInicio} - ${horaFin}</p>
            <p><strong>Fecha:</strong> ${eventDate.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p><strong>Motivo:</strong> ${motivo}</p>
          </div>
        `,
        icon: 'info',
        confirmButtonText: 'Cerrar'
      });
    } else {
      if(row?.tipoReserva === 'puntual'){
        this.opemModalReservationPuntual(row)
      }else{
        this.opemModalReservationRecurrente(row)
      }
    }
  }

  opemModalReservationPuntual(row: Reserva){
    const modalRef = this.modalService.open(BookingOneTimeModalComponent, {
        backdrop: 'static',
        size:''
    });
    modalRef.componentInstance.row = {...row.reservaPuntualDto, reservaDto:row};
    modalRef.componentInstance.accion = 'show';
    modalRef.componentInstance.canActivate = this.canActivate; 
    modalRef.componentInstance.emitList.subscribe(() => {
      this._fetchData();
    });
  }
  
  opemModalReservationRecurrente(row: Reserva){
    const modalRef = this.modalService.open(ModalRecurrentComponent, {
        backdrop: 'static',
        size:''
    });
    modalRef.componentInstance.row = {...row.reservaRecurrenteDto, reservaDto:row};
    modalRef.componentInstance.accion = 'show';
    modalRef.componentInstance.canActivate = this.canActivate; 
    modalRef.componentInstance.emitList.subscribe(() => {
      this._fetchData();
    });
  }

  /**
  * Events bind in calendar
  */
  currentEvents: EventApi[] = [];
  handleEvents(events: EventApi[]) {
    this.currentEvents = events;
    this.updateUpcomingEvents();
  }

  changeDirection() {
    this.calendarOptions.direction = this.direction;
  }

  changeLocale() {
    this.calendarOptions.locale = this.selectedLocale;
  }

  checkUncheckAll(ev: any) {
    this.masterSelected = ev.target.checked;
    this.filterArray.forEach((data: any) => {
      data.checked = this.masterSelected;
    });
    this.onCheckboxChange();
  }

  onCheckboxChange() {
    const checkedTypes = this.filterArray
      .filter((item: any) => item.checked)
      .map((item: any) => item.name);
    
    if (checkedTypes.length === 0) {
      this.calendarEvents = [];
    } else if (checkedTypes.length === this.filterArray.length) {
      this.calendarEvents = this.allcalendarEvents;
    } else {
      this.calendarEvents = this.allcalendarEvents.filter((event: any) => 
        checkedTypes.includes(event.extendedProps?.type)
      );
    }
    
    this.calendarOptions.events = this.calendarEvents;
    this.updateUpcomingEvents();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  public redirectTo() {
    this.modalService.open(this.confirmModal);
  }

  confirmReservation() {
    this.modalService.dismissAll();
    this.router.navigate(['/inicio/taxpayer']);
  }

  getEventIcon(type: string): string {
    if (type.includes('puntual')) return '📅';
    if (type.includes('recurrente')) return '🔄';
    if (type.includes('cerrado')) return '🔒';
    if (type.includes('mantenimiento')) return '🔧';
    if (type.includes('evento')) return '🎉';
    if (type.includes('especial')) return '⭐';
    return '📌';
  }
}