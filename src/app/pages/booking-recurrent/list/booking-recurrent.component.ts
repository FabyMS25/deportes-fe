import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { ngxCsv } from 'ngx-csv';
import Swal from 'sweetalert2';

import { PaginationService } from 'src/app/core/services/pagination.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { ReservaRecurrenteService } from 'src/app/core/services/api/reserva-recurrente.service';
import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.models';
import { ModalRecurrentComponent } from '../modal/modal.component';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { TicketComponent } from '../../reports/ticket/ticket.component';
import { EstadoPago, EstadoReserva, EstadoUsuario, EstadoValidacion } from 'src/app/core/constants/Estados';
import { Pago } from 'src/app/core/models/pago.model';
import { Reserva } from 'src/app/core/models/reserva.models';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { ReservaService } from 'src/app/core/services/api/reserva.service';

@Component({
  selector: 'app-booking-recurrent',
  templateUrl: './booking-recurrent.component.html',
  styleUrls: ['./booking-recurrent.component.scss']
})
export class BookingRecurrentComponent implements OnInit {

  breadCrumbItems!: Array<{}>;
  title = 'Reservas Recurrentes';
  canActivate: string[];
  itemsList: any[] = [];
  viewMode: 'table' | 'cards' = 'table';
  userData!: any;

  loading: boolean = true;
  serverSidePagination: boolean = true;
  currentPage: number = 1;
  pageSize: number = 5;
  reservasList: any;
  temp: any[] = [];
  categoryList: any[] = [];
  userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente';

  contribuyente!: any;
  dataSelected!: any;
  selectedItems: ReservaRecurrente[] = [];
  consultResults: any[] = [];

  searchResults: any;
  searchTerm: string = '';
  date!: { from: Date, to: Date };
  estadoValidacion: string = '';
  estadoReserva: string = '';
  categoria: string = '';
  tipoRecurrencia: string = '';
  activo: string = '';
  
  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  get enableSolicitudRecurrentBooking(): boolean | undefined{
    return this.systemConfigList[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
  }
  get enableRecurrentBooking(): boolean | undefined{
    return this.systemConfigList[ClaveConfiguracion.HABILITAR_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
  }
  get HorasValidacionPago(): number | undefined {
    return this.systemConfigList[ClaveConfiguracion.HORAS_VALIDACION_PAGO]?.valorNumerico;
  }  
  get HorasSlaAprobacion(): number | undefined {
    return this.systemConfigList[ClaveConfiguracion.HORAS_SLA_APROBACION]?.valorNumerico;
  }
  get MinutosGraciaNoShow(): number | undefined {
    return this.systemConfigList[ClaveConfiguracion.MINUTOS_GRACIA_NO_SHOW]?.valorNumerico;
  }
  get MinutosTimeoutGatewayPago(): number | undefined {
    return this.systemConfigList[ClaveConfiguracion.MINUTOS_TIMEOUT_GATEWAY_PAGO]?.valorNumerico;
  }

  constructor(
    private authService: AuthenticationService,
    public service: PaginationService,
    public formBuilder: UntypedFormBuilder,
    private reservaRecurrenteService: ReservaRecurrenteService,
    private pagoService: PagoService,
    private reservaService: ReservaService,
    private categoriesService: CategoriasService,
    private ruatService: RuatRequestsService,
    public modalService: NgbModal,
    private router: Router
  ) {
    this.canActivate = this.authService.hasPermission(this.title);
  }

  async ngOnInit() {
    this.breadCrumbItems = [
      { label: '' },
      { label: this.title, active: true }
    ];    
    this.itemsList = [
      { name: 'Contribuyente', prop: 'reservaDto.contribuyenteDto.nombreCompleto', visible: !this.contribuyente },
      { name: 'Complejo', prop: 'reservaDto.campoDeportivoDto.complejoDto.nombre', visible: true },
      { name: 'Campo Deportivo', prop: 'reservaDto.campoDeportivoDto.nombre', visible: false },
      { name: 'Tablero', prop: 'tableroDto.horario', visible: false },
      { name: 'Superficie', prop: 'superficie', visible: false },
      { name: 'Categoría', prop: 'categoria', visible: false, tag: true },
      { name: 'Tipo Recurrencia', prop: 'tipoRecurrencia', visible: false },
      { name: 'Fecha Inicio', prop: 'fechaInicio', date: true, visible: false },
      { name: 'Fecha Fin', prop: 'fechaFin', date: true, visible: false },
      { name: 'Días Semana', prop: 'diasSemana', visible: false },
      { name: 'Sesiones', prop: 'cantidadSesiones', visible: true },
      { name: 'Duración Sesión', prop: 'duracionSesionHoras', visible: false },
      { name: 'Personas', prop: 'cantidadPersonas', visible: false },
      { name: 'Tarifa Mensual', prop: 'tarifaMensual', visible: true },
      { name: 'Activo', prop: 'activo', tag: true, visible: false },
      { name: 'Fecha Creación', prop: 'reservaDto.fechaCreacion', date: true, visible: false },
      { name: 'Tasa', prop: 'reservaDto.numeroTasa', visible: true },
      { name: 'Estado Validación', prop: 'reservaDto.estadoValidacion', tag: true, visible: true },
      { name: 'Estado Reserva', prop: 'reservaDto.estadoReserva', tag: true, visible: true },
      { name: 'Monto Total', prop: 'reservaDto.montoTotal', visible: false },
      { name: 'Observaciones', prop: 'observaciones', visible: false },
    ];
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.systemConfigList = this.authService.getAllConfigs()
    const currentUser = this.authService.currentUser();
    if (this.authService.getUserRole() === 'Contribuyente') {
      this.contribuyente = currentUser ;
      if(!this.enableRecurrentBooking && !this.enableSolicitudRecurrentBooking){        
        const index = this.canActivate.indexOf('CREAR');
        if (index > -1) {
          this.canActivate.splice(index, 1);
        }
      }
      if (this.contribuyente.estadoUsuario !== EstadoUsuario.ACTIVO) {
        this.canActivate = ["VER"];
      }
    } else {
      this.userData = currentUser.designacion.personaDto;
    }
    if (!this.authService.isRuatAuthenticated()) {
      await this.delay(1000);
    }    
    await this.getReservations();
    await this.getCategories();
    setInterval(() => this.getReservations(), 5 * 60 * 1000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  getSelectedItems(items: any) {
    this.selectedItems = items;
  }
  toggleColumn(column: any) {
      column.visible = !column.visible;
  }
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
    localStorage.setItem('dataTableViewMode', this.viewMode);
  }

  applyFilters() {
    if (!this.temp || this.temp.length === 0) return;
    this.reservasList = this.temp.filter(item => {
      const searchMatch = !this.searchTerm || this.searchInReserva(item, this.searchTerm);
      let dateMatch = true;
      if (this.date && this.date.from && this.date.to) {
        const itemDate = new Date(item.fechaInicio);
        const fromDate = new Date(this.date.from);
        const toDate = new Date(this.date.to);        
        itemDate.setHours(0, 0, 0, 0);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(0, 0, 0, 0);        
        dateMatch = itemDate >= fromDate && itemDate <= toDate;
      }
      const estadoValidacionMatch = !this.estadoValidacion || 
        item.reservaDto?.estadoValidacion === this.estadoValidacion;
        const estadoReservaMatch = !this.estadoReserva || 
        item.reservaDto?.estadoReserva === this.estadoReserva;
      const categoriaMatch = !this.categoria || 
        item.categoria?.toLowerCase().includes(this.categoria.toLowerCase());
      const tipoRecurrenciaMatch = !this.tipoRecurrencia || 
        item.tipoRecurrencia?.toLowerCase().includes(this.tipoRecurrencia.toLowerCase());
      const activoMatch = !this.activo || 
        (this.activo === 'activo' && item.activo === true) ||
        (this.activo === 'inactivo' && item.activo === false);
      return searchMatch && dateMatch && estadoValidacionMatch && estadoReservaMatch && 
             categoriaMatch && tipoRecurrenciaMatch && activoMatch;
    });
  }

  private searchInReserva(item: ReservaRecurrente, searchTerm: string): boolean {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (item.categoria?.toLowerCase().includes(term) ||
        item.superficie?.toLowerCase().includes(term) ||
        item.observaciones?.toLowerCase().includes(term) ||
        item.tipoRecurrencia?.toLowerCase().includes(term) ||
        item.diasSemana?.toLowerCase().includes(term)) {
      return true;
    }
    if (item.reservaDto) {
      const reserva = item.reservaDto;      
      if (reserva.numeroTasa?.toLowerCase().includes(term) ||
          reserva.numeroReserva?.toLowerCase().includes(term) ||
          reserva.montoTotal?.toString().includes(term)) {
        return true;
      }      
      if (reserva.contribuyenteDto) {
        const contrib = reserva.contribuyenteDto;
        if (contrib.nombreCompleto?.toLowerCase().includes(term) ||
            contrib.nombre?.toLowerCase().includes(term) ||
            contrib.primerApellido?.toLowerCase().includes(term) ||
            contrib.segundoApellido?.toLowerCase().includes(term) ||
            contrib.numeroDocumento?.toLowerCase().includes(term) ||
            contrib.email?.toLowerCase().includes(term) ||
            contrib.telefono?.toLowerCase().includes(term)) {
          return true;
        }
      }
    }
    if (item.reservaDto) {
      if (item.reservaDto?.campoDeportivoDto.complejoDto.nombre?.toLowerCase().includes(term) ||
          item.reservaDto?.campoDeportivoDto?.nombre?.toLowerCase().includes(term)) {
        return true;
      }
    }
    return false;
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    if (changeEvent.nextId === 0) {
      this.reservasList = this.temp;
    }
    if (changeEvent.nextId === 1) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.SOLICITADA
      );
    }
    if (changeEvent.nextId === 2) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE
      );
    }
    if (changeEvent.nextId === 3) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.PAGADA
      );
    }
    if (changeEvent.nextId === 4) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.EN_CURSO
      );
    }
    if (changeEvent.nextId === 5) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.COMPLETADA
      );
    }
    if (changeEvent.nextId === 6) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.CANCELADA || 
        item.reservaDto?.estadoReserva === EstadoReserva.RECHAZADA ||
        item.reservaDto?.estadoReserva === EstadoReserva.EXPIRADA ||
        item.reservaDto?.estadoReserva === EstadoReserva.NO_SHOW
      );
    }
  }

  public showTicket(data: ReservaRecurrente) {
    const modalRef = this.modalService.open(TicketComponent, { 
      size: 'lg',
      windowClass: 'ticket-modal'
    });
    modalRef.componentInstance.bookingType = 'recurrente'
    modalRef.componentInstance.reservationData = data.reservaDto;
    modalRef.componentInstance.showAsModal = true;
    modalRef.componentInstance.autoLoad = true;
  }

  public agregarReserva() {
    this.router.navigate(['/reservations/details'], { 
      state: { 
        tipoReserva: 'recurrente'
      } 
    });
  }

  public openModal(data: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalRecurrentComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = data;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.canActivate = this.canActivate;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getReservations();
    });
  }

  async consultModal(data: any, content: any, size: string) {
    if (this.selectedItems.length === 0) {
      this.selectedItems.push(data);
    }    
    this.consultResults = [];
    this.dataSelected = null;
    this.loading = true;    
    
    let shouldRefreshData = false; 
    
    try {
      for (const item of this.selectedItems) {
        try {
          const result = await this.consultData(item);
          this.consultResults.push(result);          
          if (!this.dataSelected && result.hasPayment && result.pagoData && !result.shouldNotUpdate) {
            this.dataSelected = {
              reserva: result.item,
              pago: result.pagoData,
              ruatResponse: result.ruatResponse
            };
          }
          if (!result.shouldNotUpdate && result.hasPayment) {
            shouldRefreshData = true;
          }
        } catch (error) {
          console.error("Error during consultation for item:", error);
          this.consultResults.push({ 
            item, 
            text: 'Error durante la consulta', 
            type: 'error',
            hasPayment: false,
            shouldNotUpdate: true 
          });
        }
      }
    } finally {
      this.loading = false;      
      
      if (this.consultResults.length > 0) {
        if (this.dataSelected) {
          this.modalService.open(content, { 
            centered: true, 
            size: size
          });
        } else {
          this.modalService.open(content, { centered: true });
        }
      }    
      this.selectedItems = [];
      if (shouldRefreshData) {
        this.getReservations();
      }
    }
  }

  private async checkAndUpdateReservationStatuses(reservas: ReservaRecurrente[]): Promise<ReservaRecurrente[]> {
    const updatePromises = reservas.map(async (reserva) => {
      if (!reserva.reservaDto) return reserva;
      const reservaDto = reserva.reservaDto;      
      try {
        if (reservaDto.estadoReserva === EstadoReserva.PENDIENTE) {
          const consultResult = await this.consultData(reserva);
          if (!consultResult.hasPayment && !consultResult.shouldNotUpdate) {
            if (this.isPaymentPeriodExpired(reserva)) {
              return await this.handleExpiredPendingReservation(reserva);
            }
          } else if (consultResult.hasPayment && !consultResult.shouldNotUpdate) {
            return consultResult.item;
          }
        }
        if (reservaDto.estadoReserva === EstadoReserva.PAGADA) {
          if (this.isSessionCurrentlyActive(reserva)) {
            return await this.handleInProgressReservation(reserva);
          }
          else if (this.isTodaySessionCompleted(reserva)) {
            return reserva;
          }
        }
        if (reservaDto.estadoReserva === EstadoReserva.EN_CURSO) {
          if (!this.isSessionCurrentlyActive(reserva) && this.isTodaySessionCompleted(reserva)) {
            return await this.handleReturnToPagada(reserva);
          }
        }
        if (this.isReservationPeriodCompleted(reserva) && 
            reservaDto.estadoReserva !== EstadoReserva.COMPLETADA) {
          return await this.handleCompletedReservation(reserva);
        }     
        return reserva;
      } catch (error) {
        return reserva;
      }
    });    
    return await Promise.all(updatePromises);
  }
  private isPaymentPeriodExpired(reserva: ReservaRecurrente): boolean {
    let horasValidacion = this.HorasValidacionPago;
    if (!horasValidacion) {
      console.warn('HorasValidacionPago not configured, using default 24 hours');
      horasValidacion = 24
    }    
    if (!reserva.reservaDto?.fechaCreacion) return false;    
    const fechaCreacion = new Date(reserva.reservaDto.fechaCreacion);
    const currentDate = new Date();
    const expirationDate = new Date(fechaCreacion);
    expirationDate.setHours(expirationDate.getHours() + horasValidacion);    
    return currentDate > expirationDate;
  }
  
  private isReservationPeriodCompleted(reserva: ReservaRecurrente): boolean {
    if (!reserva.fechaFin) return false;
    
    const currentDate = new Date();
    let endDate: Date;
    
    if (reserva.fechaFin instanceof Date) {
      endDate = new Date(reserva.fechaFin);
    } else {
      // Handle fechaFin as string
      const fechaFinStr = String(reserva.fechaFin);
      const [year, month, day] = fechaFinStr.split('-').map(Number);
      endDate = new Date(year, month - 1, day);
    }
    
    // Set to end of the day for comparison
    endDate.setHours(23, 59, 59, 999);
    
    return endDate < currentDate;
  }
  
  private isSessionCurrentlyActive(reserva: ReservaRecurrente): boolean {
    const currentDate = new Date();
    
    // Check if today is within the reservation period
    if (!this.isTodayWithinReservationPeriod(reserva)) {
      return false;
    }
    
    // Check if today is a scheduled day
    if (!this.isTodayScheduledDay(reserva)) {
      return false;
    }
    
    // Get today's sessions
    const todaysSessions = this.getTodaysSessions(reserva);
    
    // Check if current time is within any session
    return todaysSessions.some(session => 
      currentDate >= session.startTime && currentDate <= session.endTime
    );
  }
  
  private isTodaySessionCompleted(reserva: ReservaRecurrente): boolean {
    const currentDate = new Date();
    
    // Check if today is within the reservation period
    if (!this.isTodayWithinReservationPeriod(reserva)) {
      return true; // If not within period, consider "completed"
    }
    
    // Check if today is a scheduled day
    if (!this.isTodayScheduledDay(reserva)) {
      return true; // If not a scheduled day, consider "completed"
    }
    
    // Get today's sessions
    const todaysSessions = this.getTodaysSessions(reserva);
    
    if (todaysSessions.length === 0) {
      return true; // No sessions scheduled for today
    }
    
    // Get the last session end time
    const lastSessionEndTime = this.getLastSessionEndTime(todaysSessions);
    
    // If current time is after the last session, today's sessions are completed
    return lastSessionEndTime !== null && lastSessionEndTime < currentDate;
  }
  
  private isTodayWithinReservationPeriod(reserva: ReservaRecurrente): boolean {
    if (!reserva.fechaInicio || !reserva.fechaFin) return false;
    
    const currentDate = new Date();
    let startDate: Date;
    let endDate: Date;
    
    // Parse fechaInicio
    if (reserva.fechaInicio instanceof Date) {
      startDate = new Date(reserva.fechaInicio);
    } else {
      const fechaInicioStr = String(reserva.fechaInicio);
      const [startYear, startMonth, startDay] = fechaInicioStr.split('-').map(Number);
      startDate = new Date(startYear, startMonth - 1, startDay);
    }
    
    // Parse fechaFin
    if (reserva.fechaFin instanceof Date) {
      endDate = new Date(reserva.fechaFin);
    } else {
      const fechaFinStr = String(reserva.fechaFin);
      const [endYear, endMonth, endDay] = fechaFinStr.split('-').map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay);
    }
    
    // Set times for comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const todayStart = new Date(currentDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(currentDate);
    todayEnd.setHours(23, 59, 59, 999);
    
    return todayStart >= startDate && todayEnd <= endDate;
  }
  
  private isTodayScheduledDay(reserva: ReservaRecurrente): boolean {
    if (!reserva.diasSemana) return false;
    
    const currentDate = new Date();
    const todayIndex = (currentDate.getDay() + 6) % 7; // Convert to 0=lunes, 6=domingo
    const scheduledDays = reserva.diasSemana.split(',').map(day => this.parseDayToTableroIndex(day.trim()));
    
    return scheduledDays.includes(todayIndex);
  }
  
  private getTodaysSessions(reserva: ReservaRecurrente): { startTime: Date, endTime: Date }[] {
    if (!reserva.tableroDto?.horario) return [];
    
    const currentDate = new Date();
    const todayIndex = (currentDate.getDay() + 6) % 7;
    const todaysSchedule = reserva.tableroDto.horario[todayIndex];
    
    if (!todaysSchedule || todaysSchedule.length === 0) return [];
    
    const sessions: { startTime: Date, endTime: Date }[] = [];
    
    todaysSchedule.forEach(timeSlot => {
      const [startTimeStr, endTimeStr] = timeSlot.split('-');
      if (startTimeStr && endTimeStr) {
        const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
        const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
        
        const startTime = new Date(currentDate);
        startTime.setHours(startHours, startMinutes, 0, 0);
        
        const endTime = new Date(currentDate);
        endTime.setHours(endHours, endMinutes, 0, 0);
        
        sessions.push({ startTime, endTime });
      }
    });
    
    return sessions;
  }
  
  private parseDayToTableroIndex(day: string): number {
    const dayMap: { [key: string]: number } = {
      'lunes': 0, 'martes': 1, 'miercoles': 2, 'miércoles': 2,
      'jueves': 3, 'viernes': 4, 'sabado': 5, 'sábado': 5,
      'domingo': 6
    };
    return dayMap[day.toLowerCase()] ?? -1;
  }
  private getLastSessionEndTime(sessions: { startTime: Date, endTime: Date }[]): Date | null {
    if (sessions.length === 0) return null;
    const sortedSessions = sessions.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
    return sortedSessions[0].endTime;
  }
  
  private async handleReturnToPagada(reserva: ReservaRecurrente): Promise<ReservaRecurrente> {
    const updatedReservaDto: any = {
      ...reserva.reservaDto,
      estadoReserva: EstadoReserva.PAGADA,
      fechaActualizacion: new Date()
    };    
    const updatedReserva = await this.reservaService.update(updatedReservaDto).toPromise();
    reserva.reservaDto = updatedReserva;
    return reserva;
  }
  private async handleCompletedReservation(reserva: ReservaRecurrente): Promise<ReservaRecurrente> {
    const updatedReservaDto: any = {
      ...reserva.reservaDto,
      estadoReserva: EstadoReserva.COMPLETADA,
      fechaActualizacion: new Date()
    };    
    const updatedReserva = await this.reservaService.update(updatedReservaDto).toPromise();
    reserva.reservaDto = updatedReserva;
    return reserva;
  }
  private async handleInProgressReservation(reserva: ReservaRecurrente): Promise<ReservaRecurrente> {
    const updatedReservaDto: any = {
      ...reserva.reservaDto,
      estadoReserva: EstadoReserva.EN_CURSO,
      fechaActualizacion: new Date()
    };    
    const updatedReserva = await this.reservaService.update(updatedReservaDto).toPromise();
    reserva.reservaDto = updatedReserva;
    return reserva;
  }
  private async handleExpiredPendingReservation(reserva: ReservaRecurrente): Promise<ReservaRecurrente> {
    const codigoAlcaldia = this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI';
    const codigoUsuario = this.systemConfigList[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '';
    if (reserva.reservaDto?.numeroTasa) {
      try {
        const requestData = {
          numeroTasa: reserva.reservaDto.numeroTasa,
          motivo: "NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO",
          observacion: "ANULADO AUTOMATICO, VENCIDO PLAZO DE RESERVA"
        };        
        await this.ruatService.cancelTasa(codigoAlcaldia, codigoUsuario, requestData).toPromise();
      } catch (error) {
        console.warn('Failed to cancel tasa in RUAT for expired reservation:', error);
        return reserva;
      }
    }
    const updatedReservaDto: any = {
      ...reserva.reservaDto,
      estadoReserva: EstadoReserva.EXPIRADA,
      motivoRechazo: "NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO",
      fechaRechazo: new Date()
    };    
    const updatedReserva = await this.reservaService.update(updatedReservaDto).toPromise();
    reserva.reservaDto = updatedReserva;
    return reserva;
  }
  private showExpiredReservationsMessage(expiredCount: number): void {
    const message = expiredCount === 1 
      ? '1 reserva ha sido cancelada por expiración' 
      : `${expiredCount} reservas han sido canceladas por expiración`;    
    Swal.fire({
      title: 'Reservas Expiradas',
      text: message,
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#299cdb',
      timer: 5000,
      timerProgressBar: true,
      showCloseButton: true
    });
  }
  
  /* API RUAT Services */
  private async consultData(item: ReservaRecurrente): Promise<any> {
    if (!item) {
      return { item, text: 'No se pudo obtener el dato seleccionado', type: 'warning' };
    }    
    try {
      const nroTasa = item.reservaDto?.numeroTasa;
      if (!nroTasa) {
        return { item, text: "No hay número de tasa asociado", type: 'warning' };
      }      
      const codigoAlcaldia = this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI';
      const resp: any = await this.ruatService.consultaPagoTasa(codigoAlcaldia, nroTasa).toPromise();      
      
      if (resp['status'] !== 'OK') {
        let errorMessage = 'Error en la consulta al RUAT';
        if (typeof resp.payload === 'string') {
          try {
            const jsonMatch = resp.payload.match(/\{.*\}/);
            if (jsonMatch) {
              const jsonPayload = JSON.parse(jsonMatch[0]);
              errorMessage = jsonPayload.mensaje || errorMessage;
            } else {
              errorMessage = resp.payload || errorMessage;
            }
          } catch (e) {
            errorMessage = resp.payload || errorMessage;
          }
        }
        return { 
          item, 
          text: errorMessage, 
          type: 'error',
          hasPayment: false,
          shouldNotUpdate: true 
        };
      }      
      
      const payload = resp.payload;
      if (!payload.continuarFlujo) {
        return { 
          item, 
          text: payload.mensaje || payload.observacion || "No se puede continuar con el flujo", 
          type: 'warning',
          hasPayment: false,
          shouldNotUpdate: true
        };
      }      
      
      if (!payload.pagoTasa) {
        return { 
          item, 
          text: payload.mensaje || payload.observacion || "No se encontraron datos de pago", 
          type: 'info',
          hasPayment: false,
          shouldNotUpdate: true 
        };
      }      
      
      const pagoData = payload.pagoTasa;
      let text = payload.mensaje || payload.observacion || "La tasa se encuentra pagada";
      
      if (item.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE || 
          item.reservaDto?.estadoReserva === EstadoReserva.SOLICITADA) {
        try {
          const [day, month, year] = pagoData.fechaPago.split('/');
          const formattedDate = `${year}-${month}-${day}`;
          const nuevoPago: Pago = {
            numeroTasa: pagoData.numeroTasa,
            tipoTasa: "TO",
            folio: pagoData.folio,
            formaPago: pagoData.formaPago,
            fechaPago: new Date(formattedDate),
            entidadFinanciera: pagoData.entidadFinanciera,
            montoPagado: parseFloat(pagoData.montoPago) || 0,
            observaciones: pagoData.observacion,
            estadoPago: EstadoPago.PAGADO,
            ultimaConsulta: new Date(),
            respuestaCompletaRuat: JSON.stringify(resp),
            reservaDto: item.reservaDto
          };
          
          const pagoResp: any = await this.pagoService.save(nuevoPago).toPromise();
          
          if (pagoResp.status === 'OK') {
            item.reservaDto.estadoReserva = EstadoReserva.PAGADA;
            const updatedReserva = await this.updateReserva(item.reservaDto);
            return { 
              item: updatedReserva.reservaRecurrenteDto, 
              text: `${text} - Pago registrado exitosamente`, 
              type: 'success',
              hasPayment: true,
              pagoData: pagoResp.payload
            };
          } else {
            return { 
              item, 
              text: 'Error al guardar el pago en el sistema', 
              type: 'error',
              hasPayment: true,
              shouldNotUpdate: true
            };
          }
        } catch (error) {
          console.error('Error saving pago:', error);
          return { 
            item, 
            text: 'Error al procesar el pago', 
            type: 'error',
            hasPayment: true,
            shouldNotUpdate: true
          };
        }
      } else {
        return { 
          item, 
          text: `${text} - Reserva en estado: ${item.reservaDto?.estadoReserva}`, 
          type: 'info',
          hasPayment: true,
          pagoData: item.reservaDto?.pagosDtoList?.[0] || pagoData
        };
      }
    } catch (error) {
      console.error('Error in consultData:', error);
      return { 
        item, 
        text: 'Error al realizar la consulta al RUAT', 
        type: 'error',
        hasPayment: false,
        shouldNotUpdate: true
      };
    }
  }

  /* API Services */
  private updateReserva(data: Reserva): Promise<Reserva> {
    return new Promise((resolve, reject) => {
      this.reservaService.update(data).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            resolve(resp.payload);
          } else {
            reject(resp.payload);
          }
        },
        error: (error) => {
          console.error("Error updating reserva:", error);
          reject(error);
        }
      });
    });
  }

  private getCategories() {
    this.categoriesService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.categoryList = data.payload;
        }
      },
      error: (error) => {
        Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
      }
    });
  }

  private async getReservations(page: number = 0, size: number = 20) {
    try {
      this.loading = true;
      const data: any = await this.reservaRecurrenteService.getAll(page, size).toPromise();      
      if (data && data['status'] === 'OK') {
        let list: ReservaRecurrente[] = [];        
        if (data.payload && data.payload.content && Array.isArray(data.payload.content)) {
          list = data.payload.content;
          this.currentPage = data.payload.number + 1;
        } else if (Array.isArray(data.payload)) {
          list = data.payload;
        }        
        if (this.contribuyente) {
          list = list.filter((item: any) => 
            item.reservaDto?.contribuyenteDto?.uuid === this.contribuyente.uuid
          );
        }
        const assignaments = localStorage.getItem("assignaments");
        const employee = assignaments ? JSON.parse(assignaments) : null;
        if (employee) {
          list = list.filter((item: any) => 
            item.reservaDto?.campoDeportivoDto?.complejoDto?.uuid === employee.complejoDto?.uuid
          );
        }
        const originalPendingCount = list.filter(item => 
          item.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE
        ).length;
        const updatedList = await this.checkAndUpdateReservationStatuses(list);
        const newlyExpiredCount = updatedList.filter(item => 
          item.reservaDto?.estadoReserva === EstadoReserva.EXPIRADA && 
          list.find(originalItem => 
            originalItem.reservaDto?.uuid === item.reservaDto?.uuid && 
            originalItem.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE
          )
        ).length;
        this.reservasList = updatedList;
        this.temp = this.reservasList;
        if (newlyExpiredCount > 0) {
          this.showExpiredReservationsMessage(newlyExpiredCount);
        }
      }
    } catch (error) {
      console.error('Error fetching reservas:', error);
      Swal.fire({ 
        text: 'Error al obtener las reservas', 
        icon: 'error', 
        confirmButtonColor: '#299cdb' 
      });
      this.reservasList = { content: [], totalElements: 0, pageable: { pageNumber: 0, pageSize: 20 } };
      this.temp = [];
    } finally {
      this.loading = false;
    }
  }

  onPageChange(page: number): void {
    const pageIndex = page - 1;
    this.getReservations(pageIndex, this.pageSize);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.getReservations(0, size);
  }
  clearFilters() {
    this.searchTerm = '';
    this.date = { from: null!, to: null! };
    this.estadoValidacion = '';
    this.estadoReserva = '';
    this.categoria = '';
    this.tipoRecurrencia = '';
    this.activo = '';
    this.applyFilters();
  }
  // Csv File Export
  csvFileExport() {
    const lista = this.selectedItems.flatMap((item: ReservaRecurrente) => {
      const baseData = {
        complejo: item.reservaDto?.campoDeportivoDto?.complejoDto?.nombre || '-',
        campoDeportivo: item.reservaDto?.campoDeportivoDto?.nombre || '-',
        tablero: item.tableroDto?.horario || '-',
        superficie: item.superficie || '-',
        categoria: item.categoria || '-',
        tipoRecurrencia: item.tipoRecurrencia || '-',
        fechaInicio: item.fechaInicio ? new Date(item.fechaInicio).toLocaleDateString() : '-',
        fechaFin: item.fechaFin ? new Date(item.fechaFin).toLocaleDateString() : '-',
        diasSemana: item.diasSemana || '-',
        cantidadSesiones: item.cantidadSesiones || '-',
        duracionSesion: item.duracionSesionHoras ? `${item.duracionSesionHoras} hrs` : '-',
        cantidadPersonas: item.cantidadPersonas || '-',
        tarifaMensual: item.tarifaMensual || '-',
        activo: item.activo ? 'Sí' : 'No',
        fechaCreacion: item.reservaDto?.fechaCreacion ? new Date(item.reservaDto.fechaCreacion).toLocaleDateString() : '-',
        tipoReserva: item.reservaDto?.tipoReserva || '-',
        numeroReserva: item.reservaDto?.numeroReserva || '-',
        tasa: item.reservaDto?.numeroTasa || '-',
        montoTotal: item.reservaDto?.montoTotal || '-',
        estadoValidacion: item.reservaDto?.estadoValidacion || '-',
        estadoReserva: item.reservaDto?.estadoReserva || '-',
        observaciones: item.observaciones || '-',
        tipoContribuyente: item.reservaDto?.contribuyenteDto?.tipoContribuyente || '-',
        contribuyente: item.reservaDto?.contribuyenteDto?.nombreCompleto || 
                     `${item.reservaDto?.contribuyenteDto?.nombre || ''} ${item.reservaDto?.contribuyenteDto?.primerApellido || ''} ${item.reservaDto?.contribuyenteDto?.segundoApellido || ''}`.trim(),
        carnet: item.reservaDto?.contribuyenteDto?.numeroDocumento || '-',
        esOrganizacion: item.reservaDto?.organizacionDto ? 'SI' : 'NO',
        nombreOrganizacion: item.reservaDto?.organizacionDto?.nombre || '-',
      };      
      return [{ ...baseData }];
    });    
    const data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Reservas Recurrentes',
      useBom: true,
      noDownload: false,
      headers: [
        "Complejo", "Campo Deportivo", "Tablero", "Superficie", "Categoría", "Tipo Recurrencia",
        "Fecha Inicio", "Fecha Fin", "Días Semana", "Cant. Sesiones", "Duración Sesión", "Cant. Personas",
        "Tarifa Mensual", "Activo", "Fecha Creación", "Tipo Reserva", "Número Reserva", "Número Tasa",
        "Monto Total", "Estado Validación", "Estado Reserva", "Observaciones",
        "Tipo Contribuyente", "Contribuyente", "Carnet",
        "Es Para Organización", "Nombre Organización"
      ]
    };   
    new ngxCsv(lista, `Reservas_Recurrentes_${new Date().toISOString().split('T')[0]}`, data);
  }
}