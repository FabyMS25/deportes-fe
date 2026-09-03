import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CalendarOptions, EventApi, EventClickArg } from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import multiMonthPlugin from '@fullcalendar/multimonth'
import esLocale from '@fullcalendar/core/locales/es';
import { CookieService } from 'ngx-cookie-service';
import Swal from 'sweetalert2';
import { take } from 'rxjs';

import { ToastService } from '../admin/toast-service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { SportsFieldsService } from 'src/app/core/services/api/sports-fields.service';
import { FacilitiesService } from 'src/app/core/services/api/facilities.service';
import { EstadoReserva, StatusUtils } from 'src/app/core/constants/Estados';
import { ReservaService } from 'src/app/core/services/api/reserva.service';

import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { EncargadoComplejo } from 'src/app/core/models/encargadoComplejo.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { BookingOneTimeModalComponent } from '../../modals/modal-booking-one-time/modal-booking-one-time.component';
import { BookingRecurrentModalComponent } from '../../modals/modal-booking-recurrent/modal-booking-recurrent.component';
import { BookingDetailModalComponent } from '../../modals/booking-detail-modal/booking-detail-modal.component';

@Component({
    selector: 'app-calendar-dashboard',
    templateUrl: './calendar-dashboard.component.html',
    styleUrls: ['./calendar-dashboard.component.scss']
})

export class CalendarDashboardComponent implements OnInit {
  private readonly visibleReservationStates: EstadoReserva[] = [
    EstadoReserva.SOLICITADA,
    EstadoReserva.PENDIENTE,
    EstadoReserva.PAGADA,
    EstadoReserva.EN_CURSO,
    EstadoReserva.COMPLETADA,
    EstadoReserva.NO_SHOW
  ];

  breadCrumbItems!: Array<{}>;
  canActivate:string[];

  allcalendarEvents: any[] = [];
  contribuyente!:Contribuyente;
  employee! : EncargadoComplejo;
  complejosList: ComplejoDeportivo[] = [];
  selectedComplejoUuid: string = 'all'; 

  calendarEvents: any[] = [];
  upcomingEvents: any[] = [];
  direction: any = 'ltr';
  selectedLocale: any = 'es';
  masterSelected: any = false;
  showFilters: boolean = false;
  filterArray: any = [
    { name: 'reserva-puntual', label: 'Puntuales', checked: true, color: '#10b981' },
    { name: 'reserva-recurrente', label: 'Recurrentes', checked: true, color: '#3b82f6' },
    { name: 'reserva-escuela', label: 'Escuelas', checked: false, color: '#f59e0b' },
    { name: 'excepcion', label: 'Excepciones', checked: true, color: '#ef4444' }
  ];
  filterEvents: any = [];
  @ViewChild('confirmModal') confirmModal!: TemplateRef<any>; 

  constructor( 
    private route: ActivatedRoute,
    private router: Router,
    public toastService: ToastService,
    private modalService: NgbModal,
    private campoDeportivoService: SportsFieldsService,
    private complejoService: FacilitiesService,
    private reservasService: ReservaService,
    private authService: AuthenticationService
  ) { 
    this.canActivate = this.authService.hasPermission('Reservas');
  }

  async ngOnInit(): Promise<void> {
    this.breadCrumbItems = [
      { label: 'Dashboards' },
      { label: 'Calendario', active: true }
    ]; 
    const currentUser = this.authService.currentUser();
    this.employee = this.authService.staff();
    if (this.authService.isTaxpayer()) {
      this.contribuyente = this.parseCurrentUser(currentUser);
    }
    this.calendarOptions = {
      ...this.calendarOptions,
      selectable: this.authService.canCurrentUserCreateReservations()
    };
    const pendingLoginEvent = this.authService.consumeLoginEvent();
    if (pendingLoginEvent) {
      this.showConsolidatedSystemStatus(pendingLoginEvent);
    } else {
      this.authService.loginEvent$
      .pipe(take(1))
      .subscribe(event => {
        this.showConsolidatedSystemStatus(event);
      });
    }
    this.loadCalendarViewPreference();
    this.applyResponsiveCalendarOptions();
    if(this.employee){
      this.complejosList = this.employee && this.employee.complejoDto ? [this.employee.complejoDto] : [];
    }else{
      try {
        this.complejosList = await this.complejoService.getAll().toPromise().then((res:any) => {
          return (res || []) as ComplejoDeportivo[];
        });
      }catch (error) {
        this.complejosList = [];
      }
    }
    this.selectedComplejoUuid = this.employee && this.employee.complejoDto?.uuid ? this.employee.complejoDto.uuid : 'all';
    this._fetchData();
  }

  private parseCurrentUser(currentUser: any): any {
    if (!currentUser || typeof currentUser !== 'string') return currentUser;

    try {
      return JSON.parse(currentUser);
    } catch {
      return null;
    }
  }

  private showConsolidatedSystemStatus(event: any): void {
    const configsLoaded = event.configsLoaded || 0;
    const finalRuatConnected = event.ruatStatus;
    let welcomeTitle = '';
    let welcomeMessage = '';
    const configsCount = Object.keys(this.authService.getAllConfigs() || {}).length;
    switch(event.message) {
      case 'welcome_admin':
        welcomeTitle = '🎉 ¡Bienvenido Administrador!';
        welcomeMessage = 'Inicio de sesión exitoso con privilegios de administrador.';
        break;
      case 'welcome_staff':
        welcomeTitle = '👤 ¡Bienvenido Encargado!';
        welcomeMessage = 'Inicio de sesión exitoso.';
        break;
      default:
        welcomeTitle = '🎉 ¡Bienvenido!';
        welcomeMessage = 'Inicio de sesión exitoso.';
    }    
    let statusMessage = 'Estado: ';
    if (configsLoaded > 0) {
      statusMessage += `Sistema conectado · Configuraciones: ${configsLoaded}\n`;
    } else {
      statusMessage += 'Sistema con conexión limitada · Configuraciones: 0\n';
    }
    if (finalRuatConnected) {
      statusMessage += 'RUAT: conectado · Todas las funciones disponibles.';
    } else {
      statusMessage += 'RUAT: no disponible.\n';
      statusMessage += 'Bloqueado: aprobar reservas con cobro, crear/anular tasas y consultar pagos RUAT.\n';
      statusMessage += 'Disponible: revisar reservas y datos ya registrados.\n';
      statusMessage += 'Si continúa, contacte al administrador o al ingeniero de sistemas.';
    }
    const fullMessage = `${welcomeMessage}\n${statusMessage}`;
    this.toastService.show(fullMessage, {
      classname: finalRuatConnected ? 'bg-success text-light' : 'bg-warning text-dark',
      header: welcomeTitle,
      delay: finalRuatConnected ? 18000 : 30000,
      replaceKey: 'system-status'
    });
  }


  onComplejoFilterChange(): void {
    this._fetchData();
  }
  getSelectedComplejo(): ComplejoDeportivo | null {
    if (this.selectedComplejoUuid === 'all') {
      return null;
    }
    return this.complejosList.find(c => c.uuid === this.selectedComplejoUuid) || null;
  }

  private async _fetchData() {    
    try {
      const [reservasPuntuales, reservasRecurrentes, camposDeportivos] = await Promise.all([
        this.reservasService.getByTipo('puntual').toPromise(),
        this.reservasService.getByTipo('recurrente').toPromise(),
        this.campoDeportivoService.getAll().toPromise()
      ]);
 
      let allEvents: any[] = [];

      if (Array.isArray(reservasPuntuales)) {
        let reservasPuntualesData = reservasPuntuales.filter((item: Reserva) =>
          this.visibleReservationStates.includes(item.estadoReserva)
        );
        
        if (this.employee) {
          reservasPuntualesData = reservasPuntualesData.filter((item: Reserva) => 
            item.campoDeportivoDto?.complejoDto?.uuid === this.employee.complejoDto?.uuid
          );
        }else if (this.selectedComplejoUuid !== 'all') {
          reservasPuntualesData = reservasPuntualesData.filter((item: Reserva) => 
            item.campoDeportivoDto?.complejoDto?.uuid === this.selectedComplejoUuid
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
          const statusColor = this.getStatusThemeColor(evt.estadoReserva);

          return {
            id: `puntual-${evt.uuid}`,
            title: `${startTime}-${endTime} | ${complejoNombre} -${campoNombre}`,
            start: `${fechaBase.split('T')[0]}T${horaEntrada}`,
            end: `${fechaBase.split('T')[0]}T${horaSalida}`,
            backgroundColor: statusColor,
            borderColor: statusColor,
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

      if (Array.isArray(reservasRecurrentes)) {
        let reservasRecurrentesData = reservasRecurrentes.filter((item: Reserva) =>
          this.visibleReservationStates.includes(item.estadoReserva)
        );
        
        if (this.employee) {
          reservasRecurrentesData = reservasRecurrentesData.filter((item: any) => 
            item.campoDeportivoDto?.complejoDto?.uuid === this.employee.complejoDto?.uuid
          );
        }else if (this.selectedComplejoUuid !== 'all') {
          reservasRecurrentesData = reservasRecurrentesData.filter((item: Reserva) => 
            item.campoDeportivoDto?.complejoDto?.uuid === this.selectedComplejoUuid
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

      if (Array.isArray(camposDeportivos)) {
        let camposDeportivosData = camposDeportivos;
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

        if (this.employee) {
          horariosExcepcion = horariosExcepcion.filter((exc: any) => 
            exc.campoDeportivoDto?.complejoDto?.uuid === this.employee.complejoDto?.uuid
          );
        } else if (this.selectedComplejoUuid !== 'all') {
          horariosExcepcion = horariosExcepcion.filter((exc: any) => 
            exc.campoDeportivoDto?.complejoDto?.uuid === this.selectedComplejoUuid
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
            title: `${startTime}-${endTime} | ${complejoNombre} -${campoNombre} - ${title}`,
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
      this.onCheckboxChange();
      
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los eventos del calendario'
      });
    }
  }

  private formatTime(time: string): string {
    if (!time) return '';
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  }

  private updateUpcomingEvents() {
    const now = new Date();
    this.upcomingEvents = [...this.calendarEvents]
      .filter(event => new Date(event.start) >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 10);
  }

  private generateRecurringEvents(reservasRecurrentes: any[]): any[] {
    const events: any[] = [];
    reservasRecurrentes.forEach((reserva: any) => {
      const reservaRecurrente = reserva.reservaRecurrenteDto;      
      if (!reservaRecurrente?.tableroDto?.horario) {
        return;
      }      
      const horario3D = reservaRecurrente.tableroDto.horario;
      if (!Array.isArray(horario3D) || horario3D.length === 0) {
        return;
      }
      const fechaInicioStr = reservaRecurrente.fechaInicio;
      const fechaFinStr = reservaRecurrente.fechaFin;
      const [startYear, startMonth, startDay] = fechaInicioStr.split('-').map(Number);
      const [endYear, endMonth, endDay] = fechaFinStr.split('-').map(Number);
      const fechaInicio = new Date(Date.UTC(startYear, startMonth - 1, startDay));
      const fechaFin = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));
      const campoNombre = reserva.campoDeportivoDto?.nombre || 'Campo';
      const complejoNombre = reserva.campoDeportivoDto?.complejoDto?.nombre || 'Complejo';
      const contribuyenteNombre = reserva.contribuyenteDto?.nombreCompleto || 
                                reserva.contribuyenteDto?.nombre || 'Cliente';
      const statusColor = this.getStatusThemeColor(reserva.estadoReserva);
      for (let monthIndex = 0; monthIndex < horario3D.length; monthIndex++) {
        const monthMatrix = horario3D[monthIndex] as any[];
        let targetYear = startYear;
        let targetMonth = startMonth - 1 + monthIndex;
        while (targetMonth >= 12) {
          targetMonth -= 12;
          targetYear++;
        }
        while (targetMonth < 0) {
          targetMonth += 12;
          targetYear--;
        }
        const lastDayOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        for (let dayIndex = 0; dayIndex < monthMatrix.length && dayIndex < lastDayOfMonth; dayIndex++) {
          const daySlots = monthMatrix[dayIndex];
          if (!Array.isArray(daySlots)) {
            continue;
          }
          const validSlots = daySlots.filter((slot: string) => 
            slot && typeof slot === 'string' && slot !== '' && slot.includes('-')
          );
          if (validSlots.length === 0) {
            continue;
          }
          const eventDate = new Date(Date.UTC(targetYear, targetMonth, dayIndex + 1));
          if (eventDate < fechaInicio || eventDate > fechaFin) {
            continue;
          }
          validSlots.forEach((slot: string) => {
            const [horaInicio, horaFin] = slot.split('-');
            const startTime = this.formatTime(horaInicio);
            const endTime = this.formatTime(horaFin);
            const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(dayIndex + 1).padStart(2, '0')}`;
            events.push({
              id: `recurrente-${reserva.uuid}-${dateStr}-${slot.replace(/:/g, '')}`,
              title: `${startTime}-${endTime} | ${campoNombre}`,
              start: `${dateStr}T${horaInicio}`,
              end: `${dateStr}T${horaFin}`,
              backgroundColor: statusColor,
              borderColor: statusColor,
              textColor: '#fff',
              extendedProps: {
                type: this.isSchoolReservation(reserva) ? 'reserva-escuela' : 'reserva-recurrente',
                row: reserva,
                description: contribuyenteNombre,
                complejo: complejoNombre,
                campo: campoNombre,
                horaInicio: startTime,
                horaFin: endTime
              }
            });
          });
        }
      }
    });
    return events;
  }

  private getStatusThemeColor(status: string): string {
    const colorName = StatusUtils.getStatusColor(status);
    const cssValue = getComputedStyle(document.documentElement).getPropertyValue(`--vz-${colorName}`);
    return cssValue ? cssValue.trim() : colorName;
  }

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
    datesSet: this.handleViewChange.bind(this),
    windowResize: this.handleCalendarResize.bind(this),
  };
  
  currentEvents: EventApi[] = [];
  handleEvents(events: EventApi[]) {
    this.currentEvents = events;
    this.updateUpcomingEvents();
  }
  
  handleEventClick(clickInfo: EventClickArg) {
    const eventType = clickInfo.event.extendedProps['type'];
    const row: Reserva = clickInfo.event.extendedProps['row'];
    const clickedDate = clickInfo.event.start ?? undefined;

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
      this.openQuickView(
        row,
        clickedDate,
        clickInfo.event.extendedProps['horaInicio'],
        clickInfo.event.extendedProps['horaFin']
      );
      // if(row.tipoReserva === 'puntual'){
      //   this.opemModalReservationPuntual(row)
      // }else{
      //   this.openModalReservationRecurrente(row, clickedDate);
      // }
    }
  }
  handleUpcomingEventClick(event: any) {
    const eventType = event.extendedProps?.type;
    const row: Reserva = event.extendedProps?.row;
    const clickedDate: Date = event.start;

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
      // if(row?.tipoReserva === 'puntual'){
      //   this.opemModalReservationPuntual(row)
      // }else{
      //   this.openModalReservationRecurrente(row, clickedDate);
      // }
      this.openQuickView(
        row,
        clickedDate,
        event.extendedProps?.horaInicio,
        event.extendedProps?.horaFin
      );
    }
  }
  
  private openQuickView(row: Reserva, clickedDate?: Date, horaInicio?: string, horaFin?: string): void {
    const modalRef = this.modalService.open(BookingDetailModalComponent, {
      backdrop: true,
      size: 'md',
      centered: true
    });
    modalRef.componentInstance.reserva = row;
    modalRef.componentInstance.clickedDate = clickedDate;
    modalRef.componentInstance.horaInicio = horaInicio;
    modalRef.componentInstance.horaFin = horaFin;
    modalRef.componentInstance.canActivate = this.canActivate;
    modalRef.componentInstance.emitList.subscribe(() => {
      this._fetchData();
    });
  }

  private saveCalendarViewPreference(view: string): void {
    try {
      const userId = this.authService.currentUser()?.uuid || 'anonymous';
      const key = `calendar_view_${userId}`;
      localStorage.setItem(key, view);
    } catch (error) {
      console.error('Error saving calendar view preference:', error);
    }
  }
  private loadCalendarViewPreference(): void {
    try {
      const userId = this.authService.currentUser()?.uuid || 'anonymous';
      const key = `calendar_view_${userId}`;
      const savedView = localStorage.getItem(key);    
      if (savedView && this.isValidView(savedView)) {
        this.calendarOptions.initialView = savedView;
      }
    } catch (error) {
      console.error('Error loading calendar view preference:', error);
    }
  }  

  private handleCalendarResize(): void {
    this.applyResponsiveCalendarOptions();
  }

  private isSchoolReservation(reserva: any): boolean {
    return !!(
      reserva?.organizacionDto?.uuid ||
      reserva?.organizacionDto?.idOrganizacion
    );
  }

  private applyResponsiveCalendarOptions(): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 576;
    this.calendarOptions = {
      ...this.calendarOptions,
      initialView: isMobile ? 'dayGridMonth' : this.calendarOptions.initialView,
      headerToolbar: isMobile
        ? {
            left: 'prev,next',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
          }
        : {
            right: 'multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            center: 'title',
            left: 'prev,next today'
          },
      buttonText: {
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana',
        day: 'Día',
        list: 'Agenda',
        year: 'Año'
      },
      dayMaxEvents: isMobile ? 2 : 3,
      dayMaxEventRows: isMobile ? 2 : 3,
      contentHeight: isMobile ? 'auto' : undefined
    };
  }
  private isValidView(view: string): boolean {
    const validViews = [
      'dayGridMonth', 
      'timeGridWeek', 
      'timeGridDay', 
      'listWeek',
      'multiMonthYear'
    ];
    return validViews.includes(view);
  }
  private handleViewChange(viewInfo: any): void {
    const currentView = viewInfo.view.type;
    if (currentView && this.isValidView(currentView)) {
      this.saveCalendarViewPreference(currentView);
    }
  }
  
  opemModalReservationPuntual(row: Reserva){
    const modalRef = this.modalService.open(BookingOneTimeModalComponent, {
        backdrop: 'static',
        size: 'lg',
        windowClass: 'booking-modal'
    });
    modalRef.componentInstance.row = {...row.reservaPuntualDto, reservaDto: row};
    modalRef.componentInstance.accion = 'show';
    modalRef.componentInstance.canActivate = this.canActivate; 
    modalRef.componentInstance.emitList.subscribe(() => {
      this._fetchData();
    });
  }

  openModalReservationRecurrente(row: Reserva, clickedDate?: Date) {
    const modalRef = this.modalService.open(BookingRecurrentModalComponent, {
      backdrop: 'static',
      size: 'lg'
    });
    modalRef.componentInstance.row = {
      ...row.reservaRecurrenteDto,
      reservaDto: row
    };
    modalRef.componentInstance.accion = 'show';
    modalRef.componentInstance.canActivate = this.canActivate;
    modalRef.componentInstance.highlightedDate = clickedDate; 
    modalRef.componentInstance.emitList.subscribe(() => {
      this._fetchData();
    });
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
    this.masterSelected = this.filterArray.every((item: any) => item.checked);
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
    if (!this.ensureReservationAllowed()) return;
    this.modalService.open(this.confirmModal);
  }

  confirmReservation() {
    if (!this.ensureReservationAllowed()) return;
    this.modalService.dismissAll();
    this.router.navigate(['/inicio/taxpayer']);
  }

  private ensureReservationAllowed(): boolean {
    if (this.authService.canCurrentUserCreateReservations()) return true;

    void Swal.fire({
      icon: 'warning',
      title: 'Reserva no disponible',
      text: this.authService.getReservationRestrictionMessage(),
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#299cdb'
    });
    return false;
  }

  getEventIcon(type: string): string {
    if (type.includes('puntual')) return '📅';
    if (type.includes('escuela')) return '🏫';
    if (type.includes('recurrente')) return '🔄';
    if (type.includes('cerrado')) return '🔒';
    if (type.includes('mantenimiento')) return '🔧';
    if (type.includes('evento')) return '🎉';
    if (type.includes('especial')) return '⭐';
    return '📌';
  }
}
