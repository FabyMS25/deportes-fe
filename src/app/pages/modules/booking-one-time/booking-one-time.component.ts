import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { PaginationService } from 'src/app/core/services/pagination.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { ReservaPuntualFilters, ReservaPuntualService } from 'src/app/core/services/api/reserva-puntual.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { EstadoReserva, EstadoValidacion, EstadoPago, EstadoUsuario, EstadoRuat, EstadoActual, StatusUtils} from 'src/app/core/constants/Estados';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { Categoria } from 'src/app/core/models/categoria.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { ReservaPuntual } from 'src/app/core/models/reservaPuntual.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { Pago } from 'src/app/core/models/pago.model';
import { TicketComponent } from '../reports/ticket/ticket.component';
import { BookingOneTimeModalComponent } from '../../modals/modal-booking-one-time/modal-booking-one-time.component';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-booking-one-time',
  templateUrl: './booking-one-time.component.html',
  styleUrls: ['./booking-one-time.component.scss']
})
export class BookingOneTimeComponent implements OnInit {
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
  userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente';
  userData!:any;
  contribuyente!: Contribuyente;
  estadoReservaOptions = StatusUtils.getReservationStatusOptions();
  estadoValidacionOptions = StatusUtils.getEstadoValidacionOptions();

  selectedItems: ReservaPuntual[] = [];
  readonly CSV_COLUMNS: CsvColumn<ReservaPuntual>[] = [
    { header: 'Complejo', value: i => i.reservaDto?.campoDeportivoDto?.complejoDto?.nombre || '-' },
    { header: 'Campo Deportivo', value: i => i.reservaDto?.campoDeportivoDto?.nombre || '-' },
    { header: 'Superficie', value: i => i.superficie || '-' },
    { header: 'Categoría', value: i => i.categoria || '-' },
    { header: 'Fecha Uso', value: i => i.fechaUso ? new Date(i.fechaUso).toLocaleDateString() : '-' },
    { header: 'Hora Inicio', value: i => i.horaInicio || '-' },
    { header: 'Hora Fin', value: i => i.horaFin || '-' },
    { header: 'Duración', value: i => i.duracionHoras ? `${i.duracionHoras} hrs` : '-' },
    { header: 'Cant. Personas', value: i => i.cantidadPersonas || '-' },
    { header: 'Precio Base Aplicado', value: i => i.precioBaseAplicado || '-' },
    { header: 'Tipo Reserva', value: i => i.reservaDto?.tipoReserva || '-' },
    { header: 'Tipo Cobro', value: i => i.reservaDto?.tarifaDto?.tipoCobro || '-' },
    { header: 'Número Reserva', value: i => i.reservaDto?.numeroReserva || '-' },
    { header: 'Número Tasa', value: i => i.reservaDto?.numeroTasa || '-' },
    { header: 'Monto Total', value: i => i.reservaDto?.montoTotal || '-' },
    { header: 'Clasificador RUAT', value: i => i.reservaDto?.tarifaDto?.clasificadorRuatDto?.nombre || '-' },
    { header: 'Reserva Gratuita', value: i => i.reservaDto?.esReservaGratuita ? 'SI' : 'NO' },
    { header: 'Motivo Gratuidad', value: i => i.reservaDto?.motivoGratuidad || '-' },
    { header: 'Tipo Organización', value: i => i.reservaDto?.organizacionDto?.tipoOrganizacion || '-' },
    { header: 'Estudiante', value: () => '-' },
    { header: 'Matrícula', value: () => '-' },
    { header: 'Estado Validación', value: i => i.reservaDto?.estadoValidacion || '-' },
    { header: 'Estado Reserva', value: i => i.reservaDto?.estadoReserva || '-' },
    { header: 'Observaciones', value: i => i.observaciones || '-' },
    { header: 'Fecha Aprobación', value: i => i.reservaDto?.fechaAprobacion ? new Date(i.reservaDto.fechaAprobacion).toLocaleDateString() : '-' },
    { header: 'Fecha Rechazo', value: i => i.reservaDto?.fechaRechazo ? new Date(i.reservaDto.fechaRechazo).toLocaleDateString() : '-' },
    { header: 'Motivo Rechazo', value: i => i.reservaDto?.motivoRechazo || '-' },
    { header: 'Aprobado Por', value: i => i.reservaDto?.aprobadoPor || '-' },
    { header: 'Tipo Contribuyente', value: i => i.reservaDto?.contribuyenteDto?.tipoContribuyente || '-' },
    { header: 'Contribuyente', value: i => i.reservaDto?.contribuyenteDto?.nombreCompleto || `${i.reservaDto?.contribuyenteDto?.nombre || ''} ${i.reservaDto?.contribuyenteDto?.primerApellido || ''} ${i.reservaDto?.contribuyenteDto?.segundoApellido || ''}`.trim() || '-' },
    { header: 'Carnet', value: i => i.reservaDto?.contribuyenteDto?.numeroDocumento || '-' },
    { header: 'Es Para Organización', value: i => i.reservaDto?.organizacionDto ? 'SI' : 'NO' },
    { header: 'Nombre Organización', value: i => i.reservaDto?.organizacionDto?.nombre || '-' },
    { header: 'Fecha Creación', value: i => i.reservaDto?.fechaCreacion ? new Date(i.reservaDto.fechaCreacion).toLocaleDateString() : '-' },
  ];
  csvExportItems: ReservaPuntual[] = [];
  searchResults: any;

  dateRange: { from: Date, to: Date } | null = null;
  filters = {
    searchTerm: '',
    estadoReserva: '',
    estadoValidacion: '',
    categoria: '',
    fromDate: null as Date | null,
    toDate: null as Date | null,
    tab: 0
  };

  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  constructor(
    private authService: AuthenticationService,
    public paginationService: PaginationService,
    private router: Router,
    public modalService: NgbModal,
    public formBuilder: UntypedFormBuilder,
    private categoriesService: CategoriasService,
    private reservaPuntualService: ReservaPuntualService,
    private reservaService: ReservaService,
    private ruatService: RuatRequestsService,
    private pagoService: PagoService,
  ) {
    this.canActivate = this.authService.hasPermission('/reservations/one-time');
  }

  async ngOnInit() {
    this.breadCrumbItems = [
      { label: 'Reservas' },
      { label: 'Reservas Puntuales', active: true }
    ];
    this.itemsList = [
      { name: 'Número Reserva', prop: 'reservaDto.numeroReserva', nowrap: true, visible: false },
      { name: 'Contribuyente', prop: 'reservaDto.contribuyenteDto.nombreCompleto', visible: !this.contribuyente },
      { name: 'Complejo', prop: 'reservaDto.campoDeportivoDto.complejoDto.nombre', visible: true },
      { name: 'Campo Deportivo', prop: 'reservaDto.campoDeportivoDto.nombre', visible: true },
      { name: 'Superficie', prop: 'superficie', visible: false },
      { name: 'Categoría', prop: 'categoria', visible: false, tag: true },

      { name: 'Clasificador RUAT', prop: 'reservaDto.tarifaDto.clasificadorRuatDto.nombre', visible: false },
      { name: 'Tipo Cobro', prop: 'reservaDto.tarifaDto.tipoCobro', nowrap: true, visible: true },

      { name: 'Fecha Uso', prop: 'fechaUso', date: true, visible: true },
      { name: 'Hora Inicio', prop: 'horaInicio', visible: false },
      { name: 'Hora Fin', prop: 'horaFin', visible: false },
      { name: 'Duración', prop: 'duracionHoras', visible: false },
      { name: 'Cant. Personas', prop: 'cantidadPersonas', visible: false },
      { name: 'Precio Base Aplicado', prop: 'precioBaseAplicado', visible: false },
      { name: 'Monto Total', prop: 'reservaDto.montoTotal', visible: true, currency: true },
      { name: 'Tasa', prop: 'reservaDto.numeroTasa', nowrap: true, visible: true },
      { name: 'Fecha Límite Pago', prop: 'reservaDto.fechaLimitePago', date: true, visible: false },
      { name: 'Anulación Automática', prop: 'reservaDto.cancelacionAutomatica', visible: false, tag: true },

      { name: 'Gratuita', prop: 'reservaDto.esReservaGratuita', visible: false, tag: true },
      { name: 'Motivo Gratuidad', prop: 'reservaDto.motivoGratuidad', visible: false },

      { name: 'Organización', prop: 'reservaDto.organizacionDto.nombre', visible: false },
      
      { name: 'Estado Validación', prop: 'reservaDto.estadoValidacion', tag: true, visible: this.canActivate.includes('VALIDAR') },
      { name: 'Estado Reserva', prop: 'reservaDto.estadoReserva', tag: true, visible: true },
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
      this.contribuyente = currentUser;
      if (this.contribuyente.estadoUsuario !== EstadoUsuario.ACTIVO) {
        this.canActivate = ["VER"];
      }
    } else {
      this.userData = currentUser.designacion.personaDto;
    }
    await this.getCategories();
    await this.getPuntualReservations();
    this.refreshTimer = setInterval(() => this.getPuntualReservations(), 5 * 60 * 1000);
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
    this.currentPage = page
    this.getPuntualReservations();
  }
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.getPuntualReservations();
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    this.filters.estadoReserva = '';
    this.filters.tab = changeEvent.nextId;
    this.currentPage = 1;
    this.getPuntualReservations();
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
    this.getPuntualReservations();
  }
  clearFilters() {
    clearTimeout(this.searchTimer);
    this.filters = {
      searchTerm: '',
      estadoReserva: '',
      estadoValidacion: '',
      categoria: '',
      fromDate: null,
      toDate: null,
      tab: 0
    };
    this.dateRange = null;
    this.currentPage = 1;
    this.getPuntualReservations();
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

  /* NAVIGATIONS & MODALS */
  public showTicket(data: ReservaPuntual) {
    const modalRef = this.modalService.open(TicketComponent, { 
      size: 'lg',
      windowClass: 'ticket-modal'
    });
    modalRef.componentInstance.bookingType = 'puntual'
    modalRef.componentInstance.reservationData = data.reservaDto;
    modalRef.componentInstance.showAsModal = true;
    modalRef.componentInstance.autoLoad = true;
  }
  public addReservation() {
    this.router.navigate(['/reservations/details'], {
      state: {
        tipoReserva: 'puntual'
      }
    });
  }
  public openModal(data: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(BookingOneTimeModalComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = data;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.canActivate = this.canActivate;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getPuntualReservations();
    });
  }
  /* BUSINESS LOGIC */
  private async checkAndUpdateReservationStatuses(
    list: ReservaPuntual[]
  ): Promise<ReservaPuntual[]> {
    const updatedList: ReservaPuntual[] = [];
    for (const reservaPun of list) {
      updatedList.push(await this.checkAndUpdateSingleReservationStatus(reservaPun));
    }
    return updatedList;
  }
  private async checkAndUpdateSingleReservationStatus(
    reservaPun: ReservaPuntual
  ): Promise<ReservaPuntual> {
      if (!reservaPun.reservaDto) return reservaPun;
      const reservaDto: Reserva = reservaPun.reservaDto;
      const terminalStates = [
        EstadoReserva.COMPLETADA,
        EstadoReserva.NO_SHOW,
        EstadoReserva.CANCELADA,
        EstadoReserva.EXPIRADA,
      ];
      if (terminalStates.includes(reservaDto.estadoReserva)) return reservaPun;
      try {
        if (reservaDto.estadoReserva === EstadoReserva.SOLICITADA) {
          if (reservaDto.estadoValidacion === EstadoValidacion.RECHAZADA) {
            return await this.updateReservationByPR(reservaPun, {
              estadoReserva: EstadoReserva.CANCELADA,
            });
          }
          return reservaPun;
        }
        if (reservaDto.estadoReserva === EstadoReserva.PENDIENTE) {
          if (reservaDto.esReservaGratuita) {
            if (reservaDto.estadoValidacion === EstadoValidacion.APROBADA) {
              if (this.isTimeCompleted(reservaPun)) {
                return await this.updateReservationByPR(reservaPun, {
                  estadoReserva: EstadoReserva.COMPLETADA,
                });
              }
              if (this.isCurrentlyActive(reservaPun)) {
                return await this.updateReservationByPR(reservaPun, {
                  estadoReserva: EstadoReserva.EN_CURSO,
                });
              }
            }
            return reservaPun;
          }
          const consultResult = await this.consultData(reservaPun, { silent: true });
          if (consultResult.consultationSuccessful) {
            if (consultResult.hasPayment) {
              if (this.isTimeCompleted(reservaPun)) {
                return await this.updateReservationByPR(reservaPun, {
                  estadoReserva: EstadoReserva.COMPLETADA,
                });
              }
              if (this.isCurrentlyActive(reservaPun)) {
                return await this.updateReservationByPR(reservaPun, {
                  estadoReserva: EstadoReserva.EN_CURSO,
                });
              }
              return await this.updateReservationByPR(reservaPun, {
                estadoReserva: EstadoReserva.PAGADA,
              });
            } else {
              if (this.isPeriodExpired(reservaPun)) {
                return await this.handleExpiredReservation(reservaPun);
              }
            }
          }
          return reservaPun;
        }
        if (
          reservaDto.estadoReserva === EstadoReserva.PAGADA ||
          reservaDto.estadoReserva === EstadoReserva.EN_CURSO
        ) {
          if (this.isTimeCompleted(reservaPun)) {
            return await this.updateReservationByPR(reservaPun, {
              estadoReserva: EstadoReserva.COMPLETADA,
            });
          }
          if (
            this.isCurrentlyActive(reservaPun) &&
            reservaDto.estadoReserva !== EstadoReserva.EN_CURSO
          ) {
            return await this.updateReservationByPR(reservaPun, {
              estadoReserva: EstadoReserva.EN_CURSO,
            });
          }
        }
        return reservaPun;
      } catch {
        return reservaPun;
      }
  }
  private isCurrentlyActive(reserva: ReservaPuntual): boolean {
    const now = new Date();    
    if (reserva.fechaUso && reserva.horaInicio && reserva.horaFin) {
      let startTime: Date;
      let endTime: Date;      
      if (reserva.fechaUso instanceof Date) {
        const usoDate = new Date(reserva.fechaUso);
        const [startHours, startMinutes, startSeconds = 0] = reserva.horaInicio.split(':').map(Number);
        startTime = new Date(usoDate);
        startTime.setHours(startHours, startMinutes, startSeconds, 0);
        const [endHours, endMinutes, endSeconds = 0] = reserva.horaFin.split(':').map(Number);
        endTime = new Date(usoDate);
        endTime.setHours(endHours, endMinutes, endSeconds, 0);
      } else {
        const fechaUsoStr = reserva.fechaUso as string;
        const [year, month, day] = fechaUsoStr.split('-').map(Number);
        const [startHours, startMinutes, startSeconds = 0] = reserva.horaInicio.split(':').map(Number);
        startTime = new Date(year, month - 1, day, startHours, startMinutes, startSeconds);
        const [endHours, endMinutes, endSeconds = 0] = reserva.horaFin.split(':').map(Number);
        endTime = new Date(year, month - 1, day, endHours, endMinutes, endSeconds);
      }      
      return now >= startTime && now <= endTime;
    }    
    return false;
  }
  private isTimeCompleted(reserva: ReservaPuntual): boolean {
    const now = new Date();    
    if (reserva.fechaUso && reserva.horaFin) {
      let endTime: Date;      
      if (reserva.fechaUso instanceof Date) {
        const usoDate = new Date(reserva.fechaUso);
        const [hours, minutes, seconds = 0] = reserva.horaFin.split(':').map(Number);
        endTime = new Date(usoDate);
        endTime.setHours(hours, minutes, seconds, 0);
      } else {
        const fechaUsoStr = reserva.fechaUso as string;
        const [year, month, day] = fechaUsoStr.split('-').map(Number);
        const [hours, minutes, seconds = 0] = reserva.horaFin.split(':').map(Number);
        endTime = new Date(year, month - 1, day, hours, minutes, seconds);
      }
      
      return endTime < now;
    }    
    return false;
  }
  private isPeriodExpired(reserva: ReservaPuntual): boolean {
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
    const now = new Date();
    const expirationDate = new Date(reserva.reservaDto.fechaLimitePago);
    return now > expirationDate;
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
  private parseRuatPaymentDate(fechaPago: string): Date | null {
    if (!fechaPago || !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPago)) {
      return null;
    }
    const [day, month, year] = fechaPago.split('/').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  /* API RUAT Services */
  private async consultData(item: ReservaPuntual, options: { silent?: boolean } = {}): Promise<any> {
    try {
      const nroTasa = item.reservaDto?.numeroTasa;
      if (!nroTasa) {
        return { item, text: "No hay número de tasa asociado", 
          type: 'warning', hasPayment: false, consultationSuccessful: false };
      }
      const resp: any = await this.ruatService.checkFeePayment(nroTasa).toPromise();
      if (!this.ruatService.canContinue(resp)) {
        return { 
          item, 
          text: this.ruatService.getResponseMessage(resp, "No se puede continuar con el flujo"), 
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
          text: this.ruatService.getResponseMessage(resp, "No se encontraron datos de pago"), 
          type: 'info',
          hasPayment: false,
          consultationSuccessful: true,
          ruatResponse: resp,
          errorCode: 'PAYMENT_NOT_FOUND'
        };
      }
      const text = this.ruatService.getResponseMessage(resp, "La tasa se encuentra pagada");
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
            tipoTasa: "TO",
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
  private async handleExpiredReservation(reserva: ReservaPuntual): Promise<ReservaPuntual> {
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
    return await this.updateReservationByPR(reserva, {
      estadoReserva: EstadoReserva.EXPIRADA,
      motivoRechazo: "NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO",
      fechaRechazo: new Date()
    });
  }
  /* API Services */
  private async updateReservationByPR(reserva: ReservaPuntual, updates: any): Promise<ReservaPuntual> {
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
          reject(error);
        }
      });
    });
  }
  private async getPuntualReservations() {
    const requestVersion = ++this.listRequestVersion;
    try {
      this.loading = true;
      const data: any = await this.reservaPuntualService.getAll(
        this.currentPage - 1,
        this.pageSize,
        this.getPuntualReservationFilters()
      ).toPromise();     
      if (requestVersion !== this.listRequestVersion) return;
      if (!data) throw new Error('Respuesta inválida del servidor');
      let list: ReservaPuntual[] = [];   
      if (data.content && Array.isArray(data.content)) {
        list = data.content;
      } else if (Array.isArray(data)) {
        list = data;
      }
      const updatedList = await this.checkAndUpdateReservationStatuses(list);
      if (requestVersion !== this.listRequestVersion) return;
      this.notifyAboutExpiredReservations(list, updatedList);
      this.reservasList ={
        ...data,
        content: updatedList
      } ;
      this.temp = updatedList;
      await this.loadPuntualReservationsForExport(data, updatedList, requestVersion);
    } catch (error) {
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

  private getPuntualReservationFilters(): ReservaPuntualFilters {
    return {
      tab: this.filters.tab,
      searchTerm: this.filters.searchTerm,
      estadoReserva: this.filters.estadoReserva,
      estadoValidacion: this.filters.estadoValidacion,
      categoria: this.filters.categoria,
      fromDate: this.filters.fromDate?.toISOString(),
      toDate: this.filters.toDate?.toISOString(),
    };
  }

  private async loadPuntualReservationsForExport(
    pageData: any,
    currentPageList: ReservaPuntual[],
    requestVersion: number
  ): Promise<void> {
    const totalElements = Number(pageData?.totalElements || currentPageList.length);
    if (totalElements <= currentPageList.length) {
      this.csvExportItems = currentPageList;
      return;
    }
    try {
      const data: any = await this.reservaPuntualService.getAll(
        0,
        totalElements,
        this.getPuntualReservationFilters()
      ).toPromise();
      let list: ReservaPuntual[] = Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data)
          ? data
          : [];
      list = this.filterPuntualReservationsByUserScope(list);
      if (requestVersion === this.listRequestVersion) this.csvExportItems = list;
    } catch {
      if (requestVersion === this.listRequestVersion) this.csvExportItems = currentPageList;
    }
  }

  private filterPuntualReservationsByUserScope(list: ReservaPuntual[]): ReservaPuntual[] {
    return list;
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
    originalList: ReservaPuntual[],
    updatedList: ReservaPuntual[]
  ): void {
    const newlyExpired = updatedList.filter(updatedItem => {
      const originalItem = originalList.find(original =>
        original.reservaDto?.uuid === updatedItem.reservaDto?.uuid
      );
      return originalItem?.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE &&
            updatedItem.reservaDto?.estadoReserva === EstadoReserva.EXPIRADA;
    });
    if (newlyExpired.length > 0) {
      const expiredCount = newlyExpired.length;
      const message = expiredCount === 1
        ? '1 reserva ha expirado por falta de pago y ha sido cancelada automáticamente.'
        : `${expiredCount} reservas han expirado por falta de pago y han sido canceladas automáticamente.`;
      Swal.fire({
        title: 'Reservas Expiradas',
        html: `
          <p>${message}</p>
          <p class="text-sm text-muted mt-2">
            <i class="fas fa-info-circle me-1"></i>
            Esta acción solo ocurre cuando la consulta RUAT fue completada correctamente y no se encontró pago.
          </p>
        `,
        icon: 'warning',
        iconColor: '#f8bb86',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#299cdb',
        timer: 7000,
        timerProgressBar: true,
        showCloseButton: true,
        backdrop: true,
        allowOutsideClick: false
      });
    }
  }
  private handleError(error: any, defaultMessage: string): void {
    Swal.fire({ 
        text: error?.message || defaultMessage, 
        icon: 'error', 
        confirmButtonColor: '#299cdb' 
    });
  } 
}
