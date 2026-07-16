import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { ngxCsv } from 'ngx-csv';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { ReservaRecurrenteFilters, ReservaRecurrenteService } from 'src/app/core/services/api/reserva-recurrente.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { EstadoReserva, EstadoValidacion, EstadoPago, EstadoUsuario, EstadoRuat, EstadoActual, StatusUtils} from 'src/app/core/constants/Estados';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { Categoria } from 'src/app/core/models/categoria.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { Pago } from 'src/app/core/models/pago.model';
import { TicketComponent } from '../reports/ticket/ticket.component';
import { BookingRecurrentModalComponent } from '../../modals/modal-booking-recurrent/modal-booking-recurrent.component';

@Component({
  selector: 'app-booking-recurrent',
  templateUrl: './booking-recurrent.component.html',
  styleUrls: ['./booking-recurrent.component.scss']
})
export class BookingRecurrentComponent implements OnInit {
  title = 'Reservas Recurrentes';
  breadCrumbItems!: Array<{}>;
  itemsList: any[] = [];
  viewMode: 'table' | 'cards' = 'table';
  serverSidePagination: boolean = true;
  currentPage: number = 1;
  pageSize: number = 5;

  canActivate: string[];
  userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente';
  userData!: any;
  contribuyente!: Contribuyente;

  estadoReservaOptions = StatusUtils.getEstadoReservaOptions();
  estadoValidacionOptions = StatusUtils.getEstadoValidacionOptions();

  loading: boolean = true;
  reservasList: any;
  temp: any[] = [];
  categoryList: Categoria[] = [];
  selectedItems: ReservaRecurrente[] = [];
  dataSelected!: any;
  consultResults: any[] = [];
  searchResults: any;

  dateRange: { from: Date, to: Date } | null = null;  
  filters = {
    searchTerm: '',
    estadoReserva: '',
    estadoValidacion: '',
    categoria: '',
    activo: '',
    fromDate: null as Date | null,
    toDate: null as Date | null,
    tab: 0
  };


  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  get enableSolicitudRecurrentBooking(): boolean | undefined{
    return this.systemConfigList[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
  }
  get enableRecurrentBooking(): boolean | undefined{
    return this.systemConfigList[ClaveConfiguracion.HABILITAR_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
  }
  constructor(
      private authService: AuthenticationService,      
      public paginationService: PaginationService,
      private router: Router,
      public modalService: NgbModal,
      public formBuilder: UntypedFormBuilder,
      private categoriesService: CategoriasService,
      private reservaRecurrenteService: ReservaRecurrenteService,
      private reservaService: ReservaService,
      private ruatService: RuatRequestsService,
      private pagoService: PagoService,
  ) {
      this.canActivate = this.authService.hasPermission(this.title);
  }

  async ngOnInit() {
    this.breadCrumbItems = [
      { label: '' },
      { label: this.title, active: true }
    ];
    this.itemsList = [
      { name: 'Número Reserva', prop: 'reservaDto.numeroReserva', visible: false },
      { name: 'Contribuyente', prop: 'reservaDto.contribuyenteDto.nombreCompleto', visible: !this.contribuyente },
      { name: 'Complejo', prop: 'reservaDto.campoDeportivoDto.complejoDto.nombre', visible: true },
      { name: 'Campo Deportivo', prop: 'reservaDto.campoDeportivoDto.nombre', visible: true },
      { name: 'Superficie', prop: 'superficie', visible: false },
      { name: 'Categoría', prop: 'categoria', visible: false, tag: true },
      
      { name: 'Clasificador RUAT', prop: 'reservaDto.tarifaDto.clasificadorRuatDto.nombre', visible: false },
      { name: 'Tipo Cobro', prop: 'reservaDto.tarifaDto.tipoCobro', visible: true },

      { name: 'Fecha Inicio', prop: 'fechaInicio', date: true, visible: false },
      { name: 'Fecha Fin', prop: 'fechaFin', date: true, visible: false },
      { name: 'Días Semana', prop: 'diasSemana', visible: false },
      { name: 'Sesiones', prop: 'cantidadSesiones', visible: false },
      { name: 'Duración Sesión', prop: 'duracionSesionHoras', visible: false },
      { name: 'Personas', prop: 'cantidadPersonas', visible: false },
      { name: 'Precio Base Aplicado', prop: 'precioBaseAplicado', visible: false },
      { name: 'Monto Total', prop: 'reservaDto.montoTotal', visible: true },
      { name: 'Tasa', prop: 'reservaDto.numeroTasa', visible: true },
      { name: 'Fecha Límite Pago', prop: 'reservaDto.fechaLimitePago', date: true, visible: false },
      { name: 'Anulación Automática', prop: 'reservaDto.cancelacionAutomatica', visible: true, tag: true },

      { name: 'Gratuita', prop: 'reservaDto.esReservaGratuita', visible: true, tag: true },
      { name: 'Motivo Gratuidad', prop: 'reservaDto.motivoGratuidad', visible: false },

      { name: 'Organización', prop: 'reservaDto.organizacionDto.nombre', visible: false },
      { name: 'Tipo Organización', prop: 'reservaDto.organizacionDto.tipoOrganizacion', visible: false },
      
      { name: 'Estado Validación', prop: 'reservaDto.estadoValidacion', tag: true, visible: this.canActivate.includes('VALIDAR') },
      { name: 'Estado Reserva', prop: 'reservaDto.estadoReserva', tag: true, visible: true },
      { name: 'Estado Pago', prop: 'reservaDto.pagosDtoList[0].estadoPago', tag: true, visible: true },
      { name: 'Observaciones', prop: 'observaciones', visible: false },

      { name: 'Fecha Creación', prop: 'reservaDto.fechaCreacion', date: true, visible: false },
      { name: 'Activo', prop: 'activo', tag: true, visible: false },
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
    await this.getRecurrentReservations();
    await this.getCategories();
    setInterval(() => this.getRecurrentReservations(), 5 * 60 * 1000);
  }
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  /* UI HANDLERS */
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
  onPageChange(page: number): void {
    this.currentPage = page;
    this.getRecurrentReservations();
  }
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.getRecurrentReservations();
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    this.filters.tab = changeEvent.nextId;
    this.currentPage = 1;
    this.getRecurrentReservations();
  }

  applyFilters() {
    this.currentPage = 1;
    this.getRecurrentReservations();
  }

  clearFilters() {
    this.filters = {
      searchTerm: '',
      estadoReserva: '',
      estadoValidacion: '',
      categoria: '',
      activo:'',
      fromDate: null,
      toDate: null,
      tab: 0
    };
    this.dateRange = null
    this.currentPage = 1;
    this.getRecurrentReservations();
  }
  onDateRangeChange(value: { from: Date, to: Date } | null): void {
      this.dateRange = value;
      if (value) {
          this.filters.fromDate = value.from;
          this.filters.toDate = value.to;
      } else {
          this.filters.fromDate = null;
          this.filters.toDate = null;
      }
      this.applyFilters();
  }

  private isRuatConnectionError(payload: any): boolean {
    const rawPayload = typeof payload === 'string'
      ? payload
      : JSON.stringify(payload || '');
    return [
      'Connection timed out',
      'ConnectException',
      'I/O error',
      'Read timed out',
      'SocketTimeoutException',
      '503',
      '502',
      '504',
      'Service Unavailable'
    ].some(term => rawPayload.includes(term));
  }
  private parseRuatPaymentDate(fechaPago: string): Date | null {
    if (!fechaPago || !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPago)) {
      return null;
    }
    const [day, month, year] = fechaPago.split('/').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  private extractRuatBusinessPayload(payload: any): any | null {
    if (!payload) return null;
    if (typeof payload === 'object') {
      return payload;
    }
    if (typeof payload !== 'string') {
      return null;
    }
    try {
      const jsonMatch = payload.match(/\{.*\}/s);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  /* NAVIGATIONS & MODALS */
  public agregarReserva() {
    this.router.navigate(['/reservations/details'], { 
      state: { 
        tipoReserva: 'recurrente'
      } 
    });
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
  public openModal(data: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(BookingRecurrentModalComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = data;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.canActivate = this.canActivate;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getRecurrentReservations();
    });
  }
  public async consultModal(data: any, content: any, size: string) {
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
          const result = await this.consultData(item, { silent: false });
          this.consultResults.push(result);          
          if (!this.dataSelected && result.hasPayment && result.pagoData) {
            this.dataSelected = {
              reserva: result.item,
              pago: result.pagoData,
              ruatResponse: result.ruatResponse
            };
          }
          if (result.hasPayment) {
            shouldRefreshData = true;
          }
        } catch (error) {
          this.consultResults.push({ 
            item, 
            text: 'Error durante la consulta', 
            type: 'error',
            hasPayment: false,
            consultationSuccessful: false,
            ruatResponse: error,
            errorCode: 'RUAT_EXCEPTION'
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
        this.getRecurrentReservations();
      }
    }
  }
  csvFileExport() {
    const lista = this.selectedItems.flatMap((item: ReservaRecurrente) => {
      const contribuyenteNombre =
        item.reservaDto?.contribuyenteDto?.nombreCompleto ||
        `${item.reservaDto?.contribuyenteDto?.nombre || ''} ${item.reservaDto?.contribuyenteDto?.primerApellido || ''} ${item.reservaDto?.contribuyenteDto?.segundoApellido || ''}`.replace(/\s+/g, ' ').trim();

      const baseData = {
        numeroReserva: item.reservaDto?.numeroReserva || '-',
        tipoReserva: item.reservaDto?.tipoReserva || '-',
        fechaCreacion: item.reservaDto?.fechaCreacion
          ? new Date(item.reservaDto.fechaCreacion).toLocaleDateString()
          : '-',
        estadoReserva: item.reservaDto?.estadoReserva || '-',
        estadoValidacion: item.reservaDto?.estadoValidacion || '-',
        activo: item.activo ? 'Sí' : 'No',

        complejo: item.reservaDto?.campoDeportivoDto?.complejoDto?.nombre || '-',
        campoDeportivo: item.reservaDto?.campoDeportivoDto?.nombre || '-',
        superficie: item.superficie || '-',
        categoria: item.categoria || '-',
        tipoCobro: item.reservaDto?.tarifaDto?.tipoCobro || '-',
        cantidadMeses:
          item.reservaDto?.tarifaDto?.tipoCobro === 'mensualidad'
            ? this.calculateMonthsForExport(item.fechaInicio, item.fechaFin)
            : '-',
        frecuenciaMensual: item.reservaDto?.tarifaDto?.frecuencia || '-',
        sesionesIncluidas: item.reservaDto?.tarifaDto?.sesionesIncluidas || '-',
        fechaInicio: item.fechaInicio ? new Date(item.fechaInicio).toLocaleDateString() : '-',
        fechaFin: item.fechaFin ? new Date(item.fechaFin).toLocaleDateString() : '-',
        diasSemana: item.diasSemana || '-',
        cantidadSesiones: item.cantidadSesiones || '-',
        duracionSesion: item.duracionSesionHoras ? `${item.duracionSesionHoras} hrs` : '-',
        cantidadPersonas: item.cantidadPersonas || '-',
        precioBaseAplicado: item.precioBaseAplicado || '-',
        tablero: item.tableroDto?.horario ? JSON.stringify(item.tableroDto.horario) : '-',

        tasa: item.reservaDto?.numeroTasa || '-',
        montoTotal: item.reservaDto?.montoTotal || '-',
        esReservaGratuita: item.reservaDto?.esReservaGratuita ? 'SI' : 'NO',
        motivoGratuidad: item.reservaDto?.motivoGratuidad || '-',

        esOrganizacion: item.reservaDto?.organizacionDto ? 'SI' : 'NO',
        nombreOrganizacion: item.reservaDto?.organizacionDto?.nombre || '-',
        tipoOrganizacion: item.reservaDto?.organizacionDto?.tipoOrganizacion || '-',
        representanteOrganizacion: item.reservaDto?.organizacionDto?.representanteDto?.nombreCompleto || '-',

        estudiante: '-',
        matricula: '-',

        tipoContribuyente: item.reservaDto?.contribuyenteDto?.tipoContribuyente || '-',
        contribuyente: contribuyenteNombre || '-',
        carnet: item.reservaDto?.contribuyenteDto?.numeroDocumento || '-',

        observaciones: item.observaciones || '-',
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
        'Número Reserva',
        'Tipo Reserva',
        'Fecha Creación',
        'Estado Reserva',
        'Estado Validación',
        'Activo',

        'Complejo',
        'Campo Deportivo',
        'Superficie',
        'Categoría',
        'Tipo Cobro',
        'Cantidad Meses',
        'Frecuencia Mensual',
        'Sesiones Incluidas',
        'Fecha Inicio',
        'Fecha Fin',
        'Días Semana',
        'Cant. Sesiones',
        'Duración Sesión',
        'Cant. Personas',
        'Tarifa Mensual',
        'Tablero',

        'Número Tasa',
        'Monto Total',
        'Reserva Gratuita',
        'Motivo Gratuidad',

        'Es Para Organización',
        'Nombre Organización',
        'Tipo Organización',
        'Representante Organización',

        'Estudiante',
        'Matrícula',

        'Tipo Contribuyente',
        'Contribuyente',
        'Carnet',

        'Observaciones'
      ]
    };

    new ngxCsv(
      lista,
      `Reservas_Recurrentes_${new Date().toISOString().split('T')[0]}`,
      data
    );
  }

  private calculateMonthsForExport(
    fechaInicio?: Date | string,
    fechaFin?: Date | string
  ): number | '-' {
    if (!fechaInicio || !fechaFin) return '-';
    const start = this.parseLocalDate(fechaInicio);
    const end = this.parseLocalDate(fechaFin);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';
    if (end < start) return 0;
    return this.calculateBillingMonths(start, end);
  }

  private parseLocalDate(dateValue: Date | string): Date {
    if (dateValue instanceof Date) {
      return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [year, month, day] = dateValue.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(dateValue);
  }

  private calculateBillingMonths(start: Date, end: Date): number {
    let count = 1;
    let cycleEnd = this.addMonthsSafe(start, count);
    while (end > cycleEnd) {
      count++;
      cycleEnd = this.addMonthsSafe(start, count);
    }
    return count;
  }

  private addMonthsSafe(date: Date, months: number): Date {
    const d = new Date(date);
    const originalDay = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(originalDay, lastDay));
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  /* BUSINESS LOGIC */
  private async checkAndUpdateReservationsStatuses(
    list: ReservaRecurrente[]
  ): Promise<ReservaRecurrente[]> {
    const updatedList: ReservaRecurrente[] = [];
    for (const reservaRec of list) {
      updatedList.push(await this.checkAndUpdateSingleReservationStatus(reservaRec));
    }
    return updatedList;
  }
  private async checkAndUpdateSingleReservationStatus(
    reservaRec: ReservaRecurrente
  ): Promise<ReservaRecurrente> {
    if (!reservaRec.reservaDto) return reservaRec;
    const reservaDto: Reserva = reservaRec.reservaDto;
    const terminalStates = [
      EstadoReserva.COMPLETADA,
      EstadoReserva.NO_SHOW,
      EstadoReserva.CANCELADA,
      EstadoReserva.EXPIRADA,
    ];
    if (terminalStates.includes(reservaDto.estadoReserva)) return reservaRec;
    try {
      if (reservaDto.estadoReserva === EstadoReserva.SOLICITADA) {
        if (
          reservaDto.estadoValidacion === EstadoValidacion.PENDIENTE &&
          this.hasPeriodStartPassed(reservaRec)
        ) {
          return await this.updateReservationByRR(reservaRec, {
            estadoReserva: EstadoReserva.CANCELADA,
            estadoValidacion: EstadoValidacion.VENCIDA,
            motivoRechazo: 'RESERVA VENCIDA SIN VALIDACIÓN ADMINISTRATIVA',
            fechaRechazo: new Date(),
          });
        }

        if (reservaDto.estadoValidacion === EstadoValidacion.RECHAZADA) {
          return await this.updateReservationByRR(reservaRec, {
            estadoReserva: EstadoReserva.CANCELADA,
          });
        }

        return reservaRec;
      }

      if (reservaDto.estadoReserva === EstadoReserva.PENDIENTE) {
        if (reservaDto.esReservaGratuita) {
          if (reservaDto.estadoValidacion === EstadoValidacion.APROBADA) {
            if (this.isPeriodCompleted(reservaRec)) {
              return await this.updateReservationByRR(reservaRec, {
                estadoReserva: EstadoReserva.COMPLETADA,
              });
            }

            if (this.isCurrentlyActive(reservaRec)) {
              return await this.updateReservationByRR(reservaRec, {
                estadoReserva: EstadoReserva.EN_CURSO,
              });
            }
          }

          return reservaRec;
        }

        const consultResult = await this.consultData(reservaRec, { silent: true });

        if (consultResult.consultationSuccessful) {
          if (consultResult.hasPayment) {
            if (this.isPeriodCompleted(reservaRec)) {
              return await this.updateReservationByRR(reservaRec, {
                estadoReserva: EstadoReserva.COMPLETADA,
              });
            }

            if (this.isCurrentlyActive(reservaRec)) {
              return await this.updateReservationByRR(reservaRec, {
                estadoReserva: EstadoReserva.EN_CURSO,
              });
            }

            return await this.updateReservationByRR(reservaRec, {
              estadoReserva: EstadoReserva.PAGADA,
            });
          }

          if (this.isPeriodExpired(reservaRec)) {
            return await this.handleExpiredgReservation(reservaRec);
          }
        }

        return reservaRec;
      }

      if (
        reservaDto.estadoReserva === EstadoReserva.PAGADA ||
        reservaDto.estadoReserva === EstadoReserva.EN_CURSO
      ) {
        if (this.isPeriodCompleted(reservaRec)) {
          return await this.updateReservationByRR(reservaRec, {
            estadoReserva: EstadoReserva.COMPLETADA,
          });
        }

        if (
          this.isCurrentlyActive(reservaRec) &&
          reservaDto.estadoReserva !== EstadoReserva.EN_CURSO
        ) {
          return await this.updateReservationByRR(reservaRec, {
            estadoReserva: EstadoReserva.EN_CURSO,
          });
        }
      }

      return reservaRec;
    } catch {
      return reservaRec;
    }
  }
  private hasPeriodStartPassed(reserva: ReservaRecurrente): boolean {
    const now = new Date();
    const startDate = new Date(reserva.fechaInicio);
    startDate.setHours(0, 0, 0, 0);
    return now > startDate;
  }
  private isCurrentlyActive(reserva: ReservaRecurrente): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // // Parse fechaInicio
    // if (reserva.fechaInicio instanceof Date) {
    //   startDate = new Date(reserva.fechaInicio);
    // } else {
    //   const fechaInicioStr = String(reserva.fechaInicio);
    //   const [startYear, startMonth, startDay] = fechaInicioStr.split('-').map(Number);
    //   startDate = new Date(startYear, startMonth - 1, startDay);
    // }
    // // Parse fechaFin
    // if (reserva.fechaFin instanceof Date) {
    //   endDate = new Date(reserva.fechaFin);
    // } else {
    //   const fechaFinStr = String(reserva.fechaFin);
    //   const [endYear, endMonth, endDay] = fechaFinStr.split('-').map(Number);
    //   endDate = new Date(endYear, endMonth - 1, endDay);
    // }
    const startDate = new Date(reserva.fechaInicio);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(reserva.fechaFin);
    endDate.setHours(23, 59, 59, 999);
    const isWithinPeriod = today >= startDate && today <= endDate;
    if (!isWithinPeriod) return false;
    const reservedDays = reserva.diasSemana?.split(',') || [];
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const todayDayName = dayNames[now.getDay()];    
    return reservedDays.includes(todayDayName);
    // Check if ALL sessions for today have ended
    // const allSessionsCompleted = todaysSessions.every(session => 
    //   currentDate > session.endTime
    // );
    // if (!allSessionsCompleted && todaysSessions.length > 1) {
    //   const sortedSessions = todaysSessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    //   const currentTime = new Date();
    //   for (let i = 0; i < sortedSessions.length - 1; i++) {
    //     const currentSession = sortedSessions[i];
    //     const nextSession = sortedSessions[i + 1];
    //     if (currentTime > currentSession.endTime && currentTime < nextSession.startTime) {
    //       return true;
    //     }
    //   }
    // }    
    // return allSessionsCompleted;
  } 
  private isPeriodCompleted(reserva: ReservaRecurrente): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(reserva.fechaFin);
    endDate.setHours(23, 59, 59, 999);
    return today > endDate;
    // if (reserva.fechaFin instanceof Date) {
    //   endDate = new Date(reserva.fechaFin);
    // } else {
    //   const fechaFinStr = String(reserva.fechaFin);
    //   const [year, month, day] = fechaFinStr.split('-').map(Number);
    //   endDate = new Date(year, month - 1, day);
    // }
  } 
  private isPeriodExpired(reserva: ReservaRecurrente): boolean {
    if(!reserva.reservaDto) return false;
    if(reserva.reservaDto.esReservaGratuita){
      return false;
    }
    if (reserva.reservaDto.cancelacionAutomatica === false) {
      return false;
    }
    if (!reserva.reservaDto.fechaLimitePago) {
      return false;
    }
    const fechaExpiracion = new Date(reserva.reservaDto.fechaLimitePago);
    const now = new Date();
    return now > fechaExpiracion;
  }
  private parseDate(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    if (typeof dateInput === 'string') {
      if (dateInput.includes('T')) {
        return new Date(dateInput);
      }
      return new Date(dateInput + 'T00:00:00');
    }
    return new Date();
  }

  /* API RUAT Services */
  private async consultData(
    item: ReservaRecurrente,
    options: { silent?: boolean } = {}
  ): Promise<any> {
    try {
      const nroTasa = item.reservaDto?.numeroTasa;

      if (!nroTasa) {
        return {
          item,
          text: 'No hay número de tasa asociado',
          type: 'warning',
          hasPayment: false,
          consultationSuccessful: false,
          errorCode: 'NO_TASA'
        };
      }
      const resp: any = await this.ruatService.consultaPagoTasa(nroTasa).toPromise();
      if (resp?.status !== 'OK') {
        if (this.isRuatConnectionError(resp?.payload)) {
          return {
            item,
            text: 'RUAT no respondió a tiempo. No se pudo verificar el pago ni actualizar la reserva. Intente nuevamente en unos minutos.',
            type: 'warning',
            hasPayment: false,
            consultationSuccessful: false,
            ruatResponse: resp,
            errorCode: 'RUAT_TIMEOUT'
          };
        }
        const ruatPayload = this.extractRuatBusinessPayload(resp?.payload);
        if (
          resp?.status === 'NOT_FOUND' &&
          ruatPayload &&
          String(ruatPayload.continuarFlujo).toLowerCase() !== 'true'
        ) {
          return {
            item,
            text: 'No se encontraron pagos realizados para esta tasa.',
            type: 'info',
            hasPayment: false,
            consultationSuccessful: true,
            ruatResponse: resp,
            errorCode: 'PAYMENT_NOT_FOUND'
          };
        }
        if (resp?.status === 'NOT_FOUND') {
          return {
            item,
            text: 'No se encontraron pagos realizados para esta tasa.',
            type: 'info',
            hasPayment: false,
            consultationSuccessful: false,
            ruatResponse: resp,
            errorCode: 'PAYMENT_NOT_FOUND'
          };
        }
        return {
          item,
          text: this.ruatService.getOperationalErrorMessage(resp, 'RUAT devolvió una respuesta inválida. No se actualizó la reserva.'),
          type: 'warning',
          hasPayment: false,
          consultationSuccessful: false,
          ruatResponse: resp,
          errorCode: 'INVALID_RESPONSE'
        };
      }
      if (!this.ruatService.canContinue(resp)) {
        return {
          item,
          text: this.ruatService.getResponseMessage(resp, 'No se puede continuar con el flujo'),
          type: 'warning',
          hasPayment: false,
          consultationSuccessful: true,
          ruatResponse: resp,
          errorCode: 'RUAT_FLOW_STOPPED'
        };
      }

      const pagoTasa = this.ruatService.getResponseData(resp)?.pagoTasa;

      if (!pagoTasa) {
        return {
          item,
          text: this.ruatService.getResponseMessage(resp, 'No se encontraron datos de pago'),
          type: 'info',
          hasPayment: false,
          consultationSuccessful: true,
          ruatResponse: resp,
          errorCode: 'PAYMENT_NOT_FOUND'
        };
      }

      const text = this.ruatService.getResponseMessage(resp, 'La tasa se encuentra pagada');

      try {
        const fechaPagoLocal = this.parseRuatPaymentDate(pagoTasa.fechaPago);

        if (!fechaPagoLocal) {
          return {
            item,
            text: 'RUAT devolvió una fecha de pago inválida. No se registró el pago.',
            type: 'error',
            hasPayment: false,
            consultationSuccessful: false,
            ruatResponse: resp,
            errorCode: 'INVALID_RESPONSE'
          };
        }

        const existingPayment = item.reservaDto?.pagosDtoList?.find(pago =>
          pago.folio === pagoTasa.folio && pago.numeroTasa === pagoTasa.numeroTasa
        );

        if (!existingPayment && item.reservaDto) {
          const nuevoPago: Pago = {
            numeroTasa: pagoTasa.numeroTasa,
            tipoTasa: 'TO',
            folio: pagoTasa.folio,
            formaPago: pagoTasa.formaPago,
            fechaPago: fechaPagoLocal,
            entidadFinanciera: pagoTasa.entidadFinanciera,
            montoPagado: parseFloat(pagoTasa.montoPago) || 0,
            observaciones: pagoTasa.observacion,
            estadoPago: EstadoPago.PAGADO,
            ultimaConsulta: new Date(),
            respuestaCompletaRuat: JSON.stringify(resp),
            reservaDto: item.reservaDto
          };

          await this.pagoService.save(nuevoPago).toPromise();
        }

        return {
          item,
          text: `${text} - Pago verificado`,
          type: 'success',
          pagoData: pagoTasa,
          hasPayment: true,
          consultationSuccessful: true,
          ruatResponse: resp
        };
      } catch (error) {
        return {
          item,
          text: 'El pago fue encontrado en RUAT, pero no pudo registrarse en el sistema.',
          type: 'error',
          hasPayment: false,
          consultationSuccessful: false,
          ruatResponse: resp,
          errorCode: 'PAYMENT_SAVE_ERROR'
        };
      }
    } catch (error) {
      return {
        item,
        text: 'Error al realizar la consulta al RUAT',
        type: 'error',
        hasPayment: false,
        consultationSuccessful: false,
        ruatResponse: error,
        errorCode: 'RUAT_EXCEPTION'
      };
    }
  }
  private async handleExpiredgReservation(reserva: ReservaRecurrente): Promise<ReservaRecurrente> {
    if (reserva.reservaDto?.numeroTasa) {
      try {
        const requestData = {
          numeroTasa: reserva.reservaDto.numeroTasa,
          motivo: "NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO",
          observacion: "ANULADO AUTOMATICO, VENCIDO PLAZO DE RESERVA"
        };
        await this.ruatService.cancelTasa(requestData).toPromise();
      } catch (error) {
        console.warn('Failed to cancel tasa in RUAT for expired reservation:', error);
        return reserva;
      }
    }
    return await this.updateReservationByRR(reserva, {
      estadoReserva: EstadoReserva.EXPIRADA,
      motivoRechazo: "NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO",
      fechaRechazo: new Date()
    });
  }

  /* API Services */
  private async updateReservationByRR(reserva: ReservaRecurrente, updates: any): Promise<ReservaRecurrente> {
    if (!reserva.reservaDto) return reserva;    
    const updatedReservaDto: Reserva = {
      ...reserva.reservaDto,
      ...updates,
      fechaActualizacion: new Date(),
    };
    try {
      const response: any = await this.reservaService.update(updatedReservaDto).toPromise();
      if (response && response.status === 'OK') {
        reserva.reservaDto = response.payload;
      } else {
        console.warn('Failed to update reservation:', response?.payload || 'Unknown error');
      }
      return reserva;
    } catch (error) { return reserva;}
  }
  private updateReservation(data: Reserva): Promise<Reserva> {
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
  private async getRecurrentReservations() {
    try {
      this.loading = true;
      const data: any = await this.reservaRecurrenteService.getAll(
        this.currentPage - 1,
        this.pageSize,
        {
          tab: this.filters.tab,
          searchTerm: this.filters.searchTerm,
          estadoReserva: this.filters.estadoReserva,
          estadoValidacion: this.filters.estadoValidacion,
          categoria: this.filters.categoria,
          activo: this.filters.activo,
          fromDate: this.filters.fromDate?.toISOString(),
          toDate: this.filters.toDate?.toISOString(),
        }
      ).toPromise();
      if (!data || data['status'] !== 'OK') {
        throw new Error(data?.payload || 'Respuesta inválida del servidor');
      }
      let list: ReservaRecurrente[] = [];
      if (data.payload?.content && Array.isArray(data.payload.content)) {
        list = data.payload.content;
      } else if (Array.isArray(data.payload)) {
        list = data.payload;
      }
      const employee = this.authService.staff();
      if(employee?.complejoDto){
          list = list.filter((item: any) => 
            item.reservaDto?.campoDeportivoDto?.complejoDto?.uuid === employee.complejoDto?.uuid
          );
      }
      if (this.contribuyente) {
        list = list.filter((item: any) => 
          item.reservaDto?.contribuyenteDto?.uuid === this.contribuyente.uuid
        );
      }
      const updatedList = await this.checkAndUpdateReservationsStatuses(list);
      this.notifyAboutExpiredReservations(list, updatedList);
      this.reservasList ={
        ...data.payload,
        content: updatedList
      } ;
      this.temp = this.reservasList;
    } catch (error:any) {
      this.loading = false;
      this.handleError(error, 'Error al obtener las reservas');
      this.reservasList = { content: [], totalElements: 0, pageable: { pageNumber: 0, pageSize: 20 } };
      this.temp = [];
    } finally {
      this.loading = false;
    }
  }
  private getCategories() {
    this.categoriesService.getAll().subscribe({
      next: (data: any) => {
        this.categoryList = data;
      },
      error: (error) => {
        this.handleError(error, 'Error al obtener las Categorías');
      }
    });
  }

  /* NOTIFICATIONS */
  private notifyAboutExpiredReservations(
    originalList: ReservaRecurrente[],
    updatedList:  ReservaRecurrente[]
  ): void {
    const newlyExpired = updatedList.filter(updated => {
      const original = originalList.find(
        o => o.reservaDto?.uuid === updated.reservaDto?.uuid
      );
      if (!original) return false;
      const wasActive = [
        EstadoReserva.SOLICITADA,
        EstadoReserva.PENDIENTE,
      ].includes(original.reservaDto?.estadoReserva as EstadoReserva);
      const isNowInactive = [
        EstadoReserva.EXPIRADA,
        EstadoReserva.CANCELADA,
      ].includes(updated.reservaDto?.estadoReserva as EstadoReserva);
      return wasActive && isNowInactive;
    });
    if (newlyExpired.length === 0) return;
    const paymentExpired = newlyExpired.filter(
      r => r.reservaDto?.estadoReserva === EstadoReserva.EXPIRADA
    );
    const validationExpired = newlyExpired.filter(
      r => r.reservaDto?.estadoValidacion === EstadoValidacion.VENCIDA
    );
    const lines: string[] = [];
    if (paymentExpired.length) {
      lines.push(
        paymentExpired.length === 1
          ? '1 reserva recurrente expiró por falta de pago y fue cancelada automáticamente.'
          : `${paymentExpired.length} reservas recurrentes expiraron por falta de pago y fueron canceladas automáticamente.`
      );
    }
    if (validationExpired.length) {
      lines.push(
        validationExpired.length === 1
          ? '1 reserva recurrente venció sin ser validada — su período de inicio ya pasó.'
          : `${validationExpired.length} reservas recurrentes vencieron sin ser validadas — su período de inicio ya pasó.`
      );
    }
    Swal.fire({
      title:             'Reservas Actualizadas Automáticamente',
      html:              lines.map(l => `<p>${l}</p>`).join(''),
      icon:              'warning',
      iconColor:         '#f8bb86',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#299cdb',
      timer:             8000,
      timerProgressBar:  true,
      showCloseButton:   true,
      allowOutsideClick: false,
    });
  }
  private handleError(error: any, defaultMessage: string): void {
    Swal.fire({ 
        text: error?.message || defaultMessage, 
        icon: 'error', 
        confirmButtonColor: '#299cdb' 
    });
  }
}
