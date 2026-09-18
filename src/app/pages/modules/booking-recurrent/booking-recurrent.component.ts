import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { ReservaRecurrenteFilters, ReservaRecurrenteService } from 'src/app/core/services/api/reserva-recurrente.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { EstadoReserva, EstadoValidacion, EstadoPago, EstadoUsuario, EstadoRuat, EstadoActual, StatusUtils, TipoBeneficiarioReserva, TipoContribuyenteReserva} from 'src/app/core/constants/Estados';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { Categoria } from 'src/app/core/models/categoria.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { Pago } from 'src/app/core/models/pago.model';
import { TicketComponent } from '../reports/ticket/ticket.component';
import { BookingRecurrentModalComponent } from '../../modals/modal-booking-recurrent/modal-booking-recurrent.component';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-booking-recurrent',
  templateUrl: './booking-recurrent.component.html',
  styleUrls: ['./booking-recurrent.component.scss']
})
export class BookingRecurrentComponent implements OnInit {
  private searchTimer?: ReturnType<typeof setTimeout>;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private listRequestVersion = 0;
  breadCrumbItems: BreadCrumbItem[] =[];
  viewMode: 'table' | 'cards' = 'table';
  canActivate: string[];
  itemsList: any[] = [];
  temp: any[] = [];
  serverSidePagination: boolean = true;
  currentPage: number = 1;
  pageSize: number = 5;

  loading: boolean = true;
  reservasList: any;
  categoryList: Categoria[] = [];
  estadoReservaOptions = StatusUtils.getReservationStatusOptions();
  estadoValidacionOptions = StatusUtils.getEstadoValidacionOptions();
  tipoBeneficiarioOptions = [
    { value: TipoBeneficiarioReserva.CONTRIBUYENTE, label: 'Contribuyente' },
    { value: TipoBeneficiarioReserva.ORGANIZACION, label: 'Organización' }
  ];
  tipoContribuyenteOptions = [
    { value: TipoContribuyenteReserva.NATURAL, label: 'Persona natural' },
    { value: TipoContribuyenteReserva.JURIDICA, label: 'Persona jurídica' }
  ];
  tipoOrganizacionOptions = [
    { value: 'asociacion_deportiva', label: 'Asociación deportiva' },
    { value: 'club_deportivo', label: 'Club deportivo' },
    { value: 'unidad_educativa', label: 'Escuela / unidad educativa' },
    { value: 'empresa_privada', label: 'Empresa privada' },
    { value: 'institucion_publica', label: 'Institución pública' }
  ];
  sortBy = 'fechaInicio';
  sortDirection: 'asc' | 'desc' = 'desc';
  userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente';
  userData!: any;
  contribuyente!: Contribuyente;

  selectedItems: ReservaRecurrente[] = [];
  readonly CSV_COLUMNS: CsvColumn<ReservaRecurrente>[] = [
    { header: 'Número Reserva', value: i => i.reservaDto?.numeroReserva || '-' },
    { header: 'Tipo Reserva', value: i => i.reservaDto?.tipoReserva || '-' },
    { header: 'Fecha Creación', value: i => i.reservaDto?.fechaCreacion ? new Date(i.reservaDto.fechaCreacion).toLocaleDateString() : '-' },
    { header: 'Estado Reserva', value: i => i.reservaDto?.estadoReserva || '-' },
    { header: 'Estado Validación', value: i => i.reservaDto?.estadoValidacion || '-' },
    { header: 'Activo', value: i => i.activo ? 'Sí' : 'No' },
    { header: 'Complejo', value: i => i.reservaDto?.campoDeportivoDto?.complejoDto?.nombre || '-' },
    { header: 'Campo Deportivo', value: i => i.reservaDto?.campoDeportivoDto?.nombre || '-' },
    { header: 'Superficie', value: i => i.superficie || '-' },
    { header: 'Categoría', value: i => i.categoria || '-' },
    { header: 'Tipo Cobro', value: i => i.reservaDto?.tarifaDto?.tipoCobro || '-' },
    { header: 'Cantidad Meses', value: i => i.reservaDto?.tarifaDto?.tipoCobro === 'mensualidad' ? this.calculateMonthsForExport(i.fechaInicio, i.fechaFin) : '-' },
    { header: 'Frecuencia Mensual', value: i => i.reservaDto?.tarifaDto?.frecuencia || '-' },
    { header: 'Sesiones Incluidas', value: i => i.reservaDto?.tarifaDto?.sesionesIncluidas || '-' },
    { header: 'Fecha Inicio', value: i => i.fechaInicio ? new Date(i.fechaInicio).toLocaleDateString() : '-' },
    { header: 'Fecha Fin', value: i => i.fechaFin ? new Date(i.fechaFin).toLocaleDateString() : '-' },
    { header: 'Días Semana', value: i => i.diasSemana || '-' },
    { header: 'Cant. Sesiones', value: i => i.cantidadSesiones || '-' },
    { header: 'Duración Sesión', value: i => i.duracionSesionHoras ? `${i.duracionSesionHoras} hrs` : '-' },
    { header: 'Cant. Personas', value: i => i.cantidadPersonas || '-' },
    { header: 'Tarifa Mensual', value: i => i.precioBaseAplicado || '-' },
    { header: 'Tablero', value: i => i.tableroDto?.horario ? JSON.stringify(i.tableroDto.horario) : '-' },
    { header: 'Número Tasa', value: i => i.reservaDto?.numeroTasa || '-' },
    { header: 'Monto Total', value: i => i.reservaDto?.montoTotal || '-' },
    { header: 'Reserva Gratuita', value: i => i.reservaDto?.esReservaGratuita ? 'SI' : 'NO' },
    { header: 'Motivo Gratuidad', value: i => i.reservaDto?.motivoGratuidad || '-' },
    { header: 'Es Para Organización', value: i => i.reservaDto?.organizacionDto ? 'SI' : 'NO' },
    { header: 'Nombre Organización', value: i => i.reservaDto?.organizacionDto?.nombre || '-' },
    { header: 'Tipo Organización', value: i => i.reservaDto?.organizacionDto?.tipoOrganizacion || '-' },
    { header: 'Representantes Organización', value: i => this.representantesOrganizacionLabel(i.reservaDto?.organizacionDto) },
    { header: 'Estudiante', value: () => '-' },
    { header: 'Matrícula', value: () => '-' },
    { header: 'Tipo Contribuyente', value: i => i.reservaDto?.contribuyenteDto?.tipoContribuyente || '-' },
    { header: 'Contribuyente', value: i => i.reservaDto?.contribuyenteDto?.nombreCompleto || `${i.reservaDto?.contribuyenteDto?.nombre || ''} ${i.reservaDto?.contribuyenteDto?.primerApellido || ''} ${i.reservaDto?.contribuyenteDto?.segundoApellido || ''}`.replace(/\s+/g, ' ').trim() || '-' },
    { header: 'Carnet', value: i => i.reservaDto?.contribuyenteDto?.numeroDocumento || '-' },
    { header: 'Observaciones', value: i => i.observaciones || '-' },
  ];
  csvExportItems: ReservaRecurrente[] = [];
  searchResults: any;

  dateRange: { from: Date, to: Date } | null = null;  
  filters = {
    searchTerm: '',
    estadoReserva: '',
    estadoValidacion: '',
    categoria: '',
    tipoBeneficiario: '',
    tipoContribuyente: '',
    tipoOrganizacion: '',
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
      this.canActivate = this.authService.hasPermission('/reservations/recurrent');
  }

  async ngOnInit() {
    this.breadCrumbItems = [
      { label: 'Reservas' },
      { label: 'Reservas Recurrentes', active: true }
    ];
    this.itemsList = [
      { name: 'Número Reserva', prop: 'reservaDto.numeroReserva', nowrap: true, visible: false, sortable: true },
      { name: 'Contribuyente', prop: 'reservaDto.contribuyenteDto.nombreCompleto', visible: !this.contribuyente, sortable: true },
      { name: 'Complejo', prop: 'reservaDto.campoDeportivoDto.complejoDto.nombre', visible: true, sortable: true },
      { name: 'Campo Deportivo', prop: 'reservaDto.campoDeportivoDto.nombre', visible: true, sortable: true },
      { name: 'Superficie', prop: 'superficie', visible: false },
      { name: 'Categoría', prop: 'categoria', visible: false, tag: true, sortable: true },
      
      { name: 'Clasificador RUAT', prop: 'reservaDto.tarifaDto.clasificadorRuatDto.nombre', visible: false },
      { name: 'Tipo Cobro', prop: 'reservaDto.tarifaDto.tipoCobro', nowrap: true, visible: false, sortable: true },

      { name: 'Fecha Inicio', prop: 'fechaInicio', date: true, visible: false, sortable: true },
      { name: 'Fecha Fin', prop: 'fechaFin', date: true, visible: false },
      { name: 'Días Semana', prop: 'diasSemana', visible: false },
      { name: 'Sesiones', prop: 'cantidadSesiones', visible: false },
      { name: 'Duración Sesión', prop: 'duracionSesionHoras', visible: false },
      { name: 'Personas', prop: 'cantidadPersonas', visible: false },
      { name: 'Precio Base Aplicado', prop: 'precioBaseAplicado', visible: false },
      { name: 'Monto Total', prop: 'reservaDto.montoTotal', visible: true, currency: true, sortable: true },
      { name: 'Tasa', prop: 'reservaDto.numeroTasa', nowrap: true, visible: true, sortable: true },
      { name: 'Fecha Límite Pago', prop: 'reservaDto.fechaLimitePago', date: true, visible: false },
      { name: 'Anulación Automática', prop: 'reservaDto.cancelacionAutomatica', visible: false, tag: true },

      { name: 'Gratuita', prop: 'reservaDto.esReservaGratuita', visible: false, tag: true },
      { name: 'Motivo Gratuidad', prop: 'reservaDto.motivoGratuidad', visible: false },

      { name: 'Organización', prop: 'reservaDto.organizacionDto.nombre', visible: false },
      { name: 'Tipo Organización', prop: 'reservaDto.organizacionDto.tipoOrganizacion', visible: false },
      
      { name: 'Estado Validación', prop: 'reservaDto.estadoValidacion', tag: true, visible: this.canActivate.includes('VALIDAR') },
      { name: 'Estado Reserva', prop: 'reservaDto.estadoReserva', tag: true, visible: true, sortable: true },
      { name: 'Estado Pago', prop: 'reservaDto.pagosDtoList[0].estadoPago', tag: true, visible: false },
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
    await this.getRecurrentReservations();
    await this.getCategories();
    this.refreshTimer = setInterval(() => this.getRecurrentReservations(), 5 * 60 * 1000);
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

  onSortChange(sort: { column: string; direction: 'asc' | 'desc' }): void {
    const sortMap: Record<string, string> = {
      'fechaInicio': 'fechaInicio',
      'categoria': 'categoria',
      'reservaDto.numeroReserva': 'numeroReserva',
      'reservaDto.contribuyenteDto.nombreCompleto': 'contribuyente',
      'reservaDto.campoDeportivoDto.complejoDto.nombre': 'complejo',
      'reservaDto.campoDeportivoDto.nombre': 'campoDeportivo',
      'reservaDto.tarifaDto.tipoCobro': 'tipoCobro',
      'reservaDto.montoTotal': 'montoTotal',
      'reservaDto.numeroTasa': 'numeroTasa',
      'reservaDto.estadoReserva': 'estadoReserva'
    };
    const mapped = sortMap[sort.column];
    if (!mapped) return;
    this.sortBy = mapped;
    this.sortDirection = sort.direction;
    this.currentPage = 1;
    this.getRecurrentReservations();
  }
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.getRecurrentReservations();
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    this.filters.estadoReserva = '';
    this.filters.tab = changeEvent.nextId;
    this.currentPage = 1;
    this.getRecurrentReservations();
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
    clearInterval(this.refreshTimer);
    ++this.listRequestVersion;
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(), 300);
  }

  onReservationStatusChange(): void {
    this.filters.tab = 0;
    this.applyFilters();
  }

  applyFilters() {
    this.currentPage = 1;
    this.getRecurrentReservations();
  }

  clearFilters() {
    clearTimeout(this.searchTimer);
    this.filters = {
      searchTerm: '',
      estadoReserva: '',
      estadoValidacion: '',
      categoria: '',
      tipoBeneficiario: '',
      tipoContribuyente: '',
      tipoOrganizacion: '',
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

  private parseRuatPaymentDate(fechaPago: string): Date | null {
    if (!fechaPago || !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPago)) {
      return null;
    }
    const [day, month, year] = fechaPago.split('/').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  /* NAVIGATIONS & MODALS */
  public addReservation() {
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
  private isCurrentlyActive(reserva: ReservaRecurrente): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
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
  } 
  private isPeriodCompleted(reserva: ReservaRecurrente): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(reserva.fechaFin);
    endDate.setHours(23, 59, 59, 999);
    return today > endDate;
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
      const resp: any = await this.ruatService.checkFeePayment(nroTasa).toPromise();
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
          text,
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
        text: this.ruatService.getResponseMessage(error, 'Error al realizar la consulta al RUAT'),
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
        const ruatResponse = await this.ruatService.cancelTasa(requestData).toPromise();
        if (!this.ruatService.canContinue(ruatResponse)) {
          console.warn('RUAT did not authorize automatic fee cancellation:', ruatResponse);
          return reserva;
        }
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
      reserva.reservaDto = response;
      return reserva;
    } catch (error) { return reserva;}
  }
  private updateReservation(data: Reserva): Promise<Reserva> {
    return new Promise((resolve, reject) => {
      this.reservaService.update(data).subscribe({
        next: (resp: any) => resolve(resp),
        error: (error) => {
          console.error("Error updating reserva:", error);
          reject(error);
        }
      });
    });
  }
  private async getRecurrentReservations() {
    const requestVersion = ++this.listRequestVersion;
    try {
      this.loading = true;
      const data: any = await this.reservaRecurrenteService.getAll(
        this.currentPage - 1,
        this.pageSize,
        this.getRecurrentReservationFilters()
      ).toPromise();
      if (requestVersion !== this.listRequestVersion) return;
      if (!data) throw new Error('Respuesta inválida del servidor');
      let list: ReservaRecurrente[] = [];
      if (data.content && Array.isArray(data.content)) {
        list = data.content;
      } else if (Array.isArray(data)) {
        list = data;
      }
      const updatedList = await this.checkAndUpdateReservationsStatuses(list);
      if (requestVersion !== this.listRequestVersion) return;
      this.notifyAboutExpiredReservations(list, updatedList);
      this.reservasList ={
        ...data,
        content: updatedList
      } ;
      this.temp = this.reservasList;
      await this.loadRecurrentReservationsForExport(data, updatedList, requestVersion);
    } catch (error:any) {
      if (requestVersion !== this.listRequestVersion) return;
      this.loading = false;
      this.handleError(error, 'Error al obtener las reservas');
      this.reservasList = { content: [], totalElements: 0, pageable: { pageNumber: 0, pageSize: 20 } };
      this.temp = [];
      this.csvExportItems = [];
    } finally {
      if (requestVersion === this.listRequestVersion) this.loading = false;
    }
  }

  private getRecurrentReservationFilters(): ReservaRecurrenteFilters {
    return {
      tab: this.filters.tab,
      searchTerm: this.filters.searchTerm,
      estadoReserva: this.filters.estadoReserva,
      estadoValidacion: this.filters.estadoValidacion,
      categoria: this.filters.categoria,
      tipoBeneficiario: this.filters.tipoBeneficiario,
      tipoContribuyente: this.filters.tipoContribuyente,
      tipoOrganizacion: this.filters.tipoOrganizacion,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
      activo: this.filters.activo,
      fromDate: this.filters.fromDate?.toISOString(),
      toDate: this.filters.toDate?.toISOString(),
    };
  }

  private async loadRecurrentReservationsForExport(
    pageData: any,
    currentPageList: ReservaRecurrente[],
    requestVersion: number
  ): Promise<void> {
    const totalElements = Number(pageData?.totalElements || currentPageList.length);
    if (totalElements <= currentPageList.length) {
      this.csvExportItems = currentPageList;
      return;
    }
    try {
      const data: any = await this.reservaRecurrenteService.getAll(
        0,
        totalElements,
        this.getRecurrentReservationFilters()
      ).toPromise();
      let list: ReservaRecurrente[] = Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data)
          ? data
          : [];
      if (requestVersion === this.listRequestVersion) this.csvExportItems = list;
    } catch {
      if (requestVersion === this.listRequestVersion) this.csvExportItems = currentPageList;
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
  representantesOrganizacionLabel(organizacion: any): string {
    const reps = organizacion?.representantesDto
      ?.map((item: any) => item?.contribuyenteDto?.nombreCompleto || [
        item?.contribuyenteDto?.nombre,
        item?.contribuyenteDto?.primerApellido,
        item?.contribuyenteDto?.segundoApellido
      ].filter(Boolean).join(' '))
      .map((value: string) => String(value || '').trim())
      .filter(Boolean);
    return reps?.length ? [...new Set(reps)].join(', ') : '-';
  }

}
