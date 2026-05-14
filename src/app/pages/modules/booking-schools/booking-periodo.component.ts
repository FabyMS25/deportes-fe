import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { ngxCsv } from 'ngx-csv';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { ReservaPeriodFilters, ReservaPeriodoService } from 'src/app/core/services/api/reserva-periodo.service';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { EstadoReserva, EstadoValidacion, EstadoPago, EstadoUsuario, EstadoRuat, EstadoActual, StatusUtils} from 'src/app/core/constants/Estados';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { Categoria } from 'src/app/core/models/categoria.model';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { ReservaPeriodo } from 'src/app/core/models/reservaPeriodo.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { Pago } from 'src/app/core/models/pago.model';
import { TicketComponent } from '../reports/ticket/ticket.component';
import { BookingPeriodoModalComponent } from '../../modals/modal-booking-school/modal-booking-school.component';
@Component({
  selector: 'app-booking-periodo',
  templateUrl: './booking-periodo.component.html',
  styleUrl: './booking-periodo.component.scss'
})
export class BookingPeriodoComponent implements OnInit {
  title = 'Escuelas Municipales';
  breadCrumbItems!: Array<{}>;
  itemsList: any[] = [];
  viewMode: 'table' | 'cards' = 'table';
  serverSidePagination = true;
  currentPage = 1;
  pageSize = 5;

  canActivate: string[];
  userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente';
  userData!: any;
  contribuyente!: Contribuyente;

  estadoReservaOptions = StatusUtils.getEstadoReservaOptions();

  loading = true;
  reservasList: any = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    pageable: { pageNumber: 0, pageSize: 5 }
  };
  temp: any[] = [];
  categoryList: Categoria[] = [];
  escuelasList: Organizacion[] = [];
  estudiantesList: EstudianteEscuela[] = [];
  selectedItems: ReservaPeriodo[] = [];
  dataSelected!: any;
  consultResults: any[] = [];
  searchResults: any;
  periodosDisponibles: string[] = [];
  currentPeriodo = '';

  filters: ReservaPeriodFilters = {
    searchTerm: '',
    estadoReserva: '',
    categoria: '',
    escuelaFiltro: '',
    periodoFiltro: '',
    tab: 0
  };

  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  get HorasValidacionPago(): number | undefined {
    return this.systemConfigList[ClaveConfiguracion.HORAS_VALIDACION_PAGO]?.valorNumerico;
  }

  constructor(
    private authService: AuthenticationService,
    public paginationService: PaginationService,
    private router: Router,
    public modalService: NgbModal,
    public formBuilder: UntypedFormBuilder,
    private categoriesService: CategoriasService,
    private reservaPeriodoService: ReservaPeriodoService,
    private reservaService: ReservaService,
    private ruatService: RuatRequestsService,
    private pagoService: PagoService,
    private organizacionesService: OrganizacionService,
    private estuduanteService: EstudianteEscuelaService,
  ) {
    this.canActivate = this.authService.hasPermission(this.title);
  }

  async ngOnInit() {
    this.breadCrumbItems = [
      { label: '' },
      { label: this.title, active: true }
    ];

    this.itemsList = [
      { name: 'Número Reserva', prop: 'reservaDto.numeroReserva', visible: true, fallbackProp: 'numeroReserva' },
      { name: 'Contribuyente', prop: 'reservaDto.contribuyenteDto.nombreCompleto', visible: !this.contribuyente },
      { name: 'Complejo', prop: 'reservaDto.campoDeportivoDto.complejoDto.nombre', visible: false, fallbackProp: 'complejo' },
      { name: 'Campo Deportivo', prop: 'reservaDto.campoDeportivoDto.nombre', visible: false, fallbackProp: 'campoDeportivo' },
      { name: 'Disciplina', prop: 'reservaDto.organizacionDto.disciplina', visible: false, fallbackProp: 'disciplina' },
      { name: 'Entrenador', prop: 'reservaDto.organizacionDto.entrenador', visible: false, fallbackProp: 'entrenador' },
      { name: 'Estudiante', prop: 'reservaDto.estudianteEscuelaDto.nombreCompleto', visible: true, fallbackProp: 'nombreCompleto' },
      { name: 'Matrícula', prop: 'reservaDto.estudianteEscuelaDto.matricula', visible: true, fallbackProp: 'matricula' },
      { name: 'Escuela', prop: 'reservaDto.organizacionDto.nombre', visible: true, fallbackProp: 'nombre' },
      { name: 'Mes', prop: 'mes', visible: false, fallbackProp: 'mes' },
      { name: 'Año', prop: 'año', visible: false, fallbackProp: 'año' },
      { name: 'Monto', prop: 'reservaDto.montoTotal', currency: true, visible: true, fallbackProp: 'montoTotal' },
      { name: 'Número Tasa', prop: 'reservaDto.numeroTasa', visible: true, fallbackProp: 'numeroTasa' },
      { name: 'Estado Mensualidad', prop: 'reservaDto.estadoReserva', tag: true, visible: true, fallbackProp: 'estadoReserva' },
      { name: 'Estado Pago', prop: 'reservaDto.pagosDtoList[0].estadoPago', tag: true, visible: true },
      { name: 'Fecha Pago', prop: 'fechaPago', date: true, visible: false, fallbackProp: 'fechaPago' },
      { name: 'Observaciones', prop: 'reservaDto.observaciones', visible: false, fallbackProp: 'observaciones' },
      { name: 'Fecha Creación', prop: 'reservaDto.fechaCreacion', date: true, visible: false, fallbackProp: 'fechaCreacion' },
    ];

    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }

    this.systemConfigList = this.authService.getAllConfigs();
    const currentUser = this.authService.currentUser();

    if (this.authService.getUserRole() === 'Contribuyente') {
      this.contribuyente = currentUser;
      if (this.contribuyente.estadoUsuario !== EstadoUsuario.ACTIVO) {
        this.canActivate = ['VER'];
      }
    } else {
      this.userData = currentUser.designacion.personaDto;
    }

    if (!this.authService.isRuatAuthenticated()) {
      await this.delay(1000);
    }

    this.generatePeriodosDisponibles();
    this.setDefaultPeriodoFiltro();
    this.loadEscuelas();
    this.loadEstudiantes();
    await this.getPeriodReservations();

    setInterval(() => this.getPeriodReservations(), 5 * 60 * 1000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setDefaultPeriodoFiltro(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    this.currentPeriodo = `${year}-${month}`;
    this.filters.periodoFiltro = this.currentPeriodo;
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

  onPageChange(page: number): void {
    this.currentPage = page;
    this.getPeriodReservations();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.getPeriodReservations();
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    this.filters.tab = changeEvent.nextId;
    this.currentPage = 1;
    this.getPeriodReservations();
  }

  applyFilters() {
    this.currentPage = 1;
    this.getPeriodReservations();
  }

  clearFilters() {
    this.filters = {
      searchTerm: '',
      estadoReserva: '',
      categoria: '',
      escuelaFiltro: '',
      periodoFiltro: this.currentPeriodo,
      tab: 0
    };
    this.currentPage = 1;
    this.getPeriodReservations();
  }

  private generatePeriodosDisponibles(): void {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    this.periodosDisponibles = [];

    for (let i = -6; i <= 6; i++) {
      const year = currentYear + Math.floor((currentMonth + i - 1) / 12);
      const month = ((currentMonth + i - 1) % 12 + 12) % 12 + 1;
      const periodo = `${year}-${month.toString().padStart(2, '0')}`;
      this.periodosDisponibles.push(periodo);
    }
  }

  getPeriodoDisplay(periodo: string): string {
    const [year, month] = periodo.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  }

  getPeriodoDisplayForReserva(item: any): string {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${monthNames[item.mes - 1]} ${item.año}`;
  }

  get hasPeriodoSeleccionado(): boolean {
    return !!this.filters.periodoFiltro;
  }

  get hasResultsForPeriodo(): boolean {
    return (this.reservasList?.content?.length || 0) > 0;
  }

  get emptyStateMessage(): string {
    if (!this.filters.periodoFiltro) {
      return 'Seleccione un período para ver o registrar mensualidades.';
    }
    return `No hay mensualidades registradas para ${this.getPeriodoDisplay(this.filters.periodoFiltro)}.`;
  }

  public generarNuevaMensualidad(): void {
    if (this.escuelasList.length === 0) {
      Swal.fire({
        title: 'No hay escuelas disponibles',
        text: 'No se encontraron escuelas municipales registradas en el sistema.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const modalRef = this.modalService.open(BookingPeriodoModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static'
    });

    modalRef.componentInstance.accion = '';
    modalRef.componentInstance.canActivate = this.canActivate;
    modalRef.componentInstance.estudiantes = this.estudiantesList;
    modalRef.componentInstance.defaultPeriodo = this.filters.periodoFiltro || this.currentPeriodo;
    modalRef.componentInstance.reservaGenerada.subscribe((reserva: Reserva) => {
      this.procesarReservaGenerada(reserva);
    });
  }

  private async procesarReservaGenerada(reserva: Reserva): Promise<void> {
    try {
      this.loading = true;

      if (reserva?.uuid) {
        await this.getPeriodReservations();
        return;
      }

      const response: any = await this.reservaService.create(reserva).toPromise();
      if (response.status !== 'OK') {
        throw new Error(response.message || response.payload || 'Error al guardar la reserva');
      }

      await this.getPeriodReservations();
    } catch (error: any) {
      Swal.fire({
        title: 'Error',
        text: error?.message || 'No se pudo generar la mensualidad. Por favor, intente nuevamente.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    } finally {
      this.loading = false;
    }
  }

  private async getPeriodReservations() {
    try {
      this.loading = true;

      const data: any = await this.reservaPeriodoService.getAll(
        this.currentPage - 1,
        this.pageSize,
        {
          tab: this.filters.tab,
          searchTerm: this.filters.searchTerm,
          estadoReserva: this.filters.estadoReserva,
          categoria: this.filters.categoria,
          escuelaFiltro: this.filters.escuelaFiltro,
          periodoFiltro: this.filters.periodoFiltro,
        }
      ).toPromise();

      if (!data || data['status'] !== 'OK') {
        throw new Error(data?.payload || 'Respuesta inválida del servidor');
      }

      let list: ReservaPeriodo[] = [];
      if (data.payload?.content && Array.isArray(data.payload.content)) {
        list = data.payload.content;
      } else if (Array.isArray(data.payload)) {
        list = data.payload;
      }

      const employee = this.authService.staff();
      if (employee?.complejoDto) {
        list = list.filter((item: any) =>
          item.reservaDto?.campoDeportivoDto?.complejoDto?.uuid === employee.complejoDto?.uuid
        );
      }

      if (this.contribuyente) {
        list = list.filter((item: any) =>
          item.reservaDto?.contribuyenteDto?.uuid === this.contribuyente.uuid
        );
      }

      const updatedList = await this.checkAndUpdateReservationStatuses(list);

      this.reservasList = {
        ...data.payload,
        content: updatedList
      };

      this.temp = updatedList;
    } catch (error: any) {
      this.loading = false;
      this.handleError(error, 'Error al obtener las mensualidades');
      this.reservasList = { content: [], totalElements: 0, pageable: { pageNumber: 0, pageSize: 20 } };
      this.temp = [];
    } finally {
      this.loading = false;
    }
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
  public showTicket(data: any) {
    const modalRef = this.modalService.open(TicketComponent, { 
      size: 'lg',
      windowClass: 'ticket-modal'
    });
    modalRef.componentInstance.bookingType = 'periodo'
    modalRef.componentInstance.reservationData = data.reservaDto;
    modalRef.componentInstance.showAsModal = true;
    modalRef.componentInstance.autoLoad = true;
  }
  
  public openModal(data: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(BookingPeriodoModalComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = data;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.canActivate = this.canActivate;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getPeriodReservations();
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
          if ( result.hasPayment) {
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
        this.getPeriodReservations();
      }
    }
  }
  public csvFileExport() {
    const lista = this.selectedItems.flatMap((item: any) => {
      const baseData = {
        estudiante: item.reservaDto?.estudianteEscuelaDto?.nombreCompleto || '-',
        matricula: item.reservaDto?.estudianteEscuelaDto?.matricula || '-',
        escuela: item.reservaDto?.organizacionDto?.nombre || '-',
        periodo: this.getPeriodoDisplayForReserva(item),
        disciplina: item.reservaDto?.organizacionDto?.disciplina || '-',
        entrenador: item.reservaDto?.organizacionDto?.entrenador || '-',
        mes: item.mes || '-',
        año: item.año || '-',
        montoTotal: item.reservaDto?.montoTotal || '-',
        estadoValidacion: item.reservaDto?.estadoValidacion || '-',
        estadoReserva: item.reservaDto?.estadoReserva || '-',
        numeroReserva: item.reservaDto?.numeroReserva || '-',
        numeroTasa: item.reservaDto?.numeroTasa || '-',
        fechaCreacion: item.reservaDto?.fechaCreacion ? new Date(item.reservaDto.fechaCreacion).toLocaleDateString() : '-',
        fechaPago: item.fechaPago ? new Date(item.fechaPago).toLocaleDateString() : '-',
        complejo: item.reservaDto?.campoDeportivoDto?.complejoDto?.nombre || '-',
        campoDeportivo: item.reservaDto?.campoDeportivoDto?.nombre || '-'
      };      
      return [{ ...baseData }];
    });
    const data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Mensualidades - Escuelas Municipales',
      useBom: true,
      noDownload: false,
      headers: [
        "Estudiante", "Matrícula", "Escuela", "Período", "Disciplina", "Entrenador",
        "Mes", "Año", "Monto Total", "Estado Validación", "Estado Reserva",
        "Número Reserva", "Número Tasa", "Fecha Creación", "Fecha Pago",
        "Complejo", "Campo Deportivo"
      ]
    };
    new ngxCsv(lista, `Mensualidades_Escuelas_${new Date().toISOString().split('T')[0]}`, data);
  }

  /* BUSINESS LOGIC */
  private async checkAndUpdateReservationStatuses(
    list: ReservaPeriodo[]
  ): Promise<ReservaPeriodo[]> {
    const updatedList: ReservaPeriodo[] = [];
    for (const reservaPer of list) {
      updatedList.push(await this.checkAndUpdateSingleReservationStatus(reservaPer));
    }
    return updatedList;
  }

  private async checkAndUpdateSingleReservationStatus(
    reservaPer: ReservaPeriodo
  ): Promise<ReservaPeriodo> {
    if (!reservaPer.reservaDto) return reservaPer;
    const reservaDto: Reserva = reservaPer.reservaDto;
    const terminalStates = [
      EstadoReserva.COMPLETADA,
      EstadoReserva.NO_SHOW,
      EstadoReserva.CANCELADA,
      EstadoReserva.EXPIRADA
    ];
    if (terminalStates.includes(reservaDto.estadoReserva)) {
      return reservaPer;
    }
    try {
      if (reservaDto.estadoReserva === EstadoReserva.PENDIENTE) {
        const consultResult = await this.consultData(reservaPer, { silent: true });
        if (consultResult.consultationSuccessful && consultResult.hasPayment) {
          return await this.updateReservationByRP(reservaPer, {
            estadoReserva: EstadoReserva.PAGADA,
            fechaActualizacion: new Date()
          });
        }
        return reservaPer;
      }
      if (
        reservaDto.estadoReserva === EstadoReserva.PAGADA &&
        this.isUsageDatePassed(reservaPer)
      ) {
        return await this.updateReservationByRP(reservaPer, {
          estadoReserva: EstadoReserva.COMPLETADA,
          fechaActualizacion: new Date()
        });
      }

      return reservaPer;
    } catch {
      return reservaPer;
    }
  }

  private isUsageDatePassed(reserva: ReservaPeriodo): boolean {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    if (reserva.año < currentYear) {
      return true;
    } else if (reserva.año === currentYear && reserva.mes < currentMonth) {
      return true;
    }    
    return false;
  }

  /* API RUAT Services */
  private async consultData(
    item: ReservaPeriodo,
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
      const codigoAlcaldia = this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI';
      const resp: any = await this.ruatService.consultaPagoTasa(codigoAlcaldia, nroTasa).toPromise();
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
          text: 'RUAT devolvió una respuesta inválida. No se actualizó la reserva.',
          type: 'warning',
          hasPayment: false,
          consultationSuccessful: false,
          ruatResponse: resp,
          errorCode: 'INVALID_RESPONSE'
        };
      }
      if (String(resp.payload?.continuarFlujo).toLowerCase() !== 'true') {
        return {
          item,
          text: resp.payload?.mensaje || resp.payload?.observacion || 'No se puede continuar con el flujo',
          type: 'warning',
          hasPayment: false,
          consultationSuccessful: true,
          ruatResponse: resp,
          errorCode: 'RUAT_FLOW_STOPPED'
        };
      }
      const pagoTasa = resp.payload?.pagoTasa;
      if (!pagoTasa) {
        return {
          item,
          text: resp.payload?.mensaje || resp.payload?.observacion || 'No se encontraron datos de pago',
          type: 'info',
          hasPayment: false,
          consultationSuccessful: true,
          ruatResponse: resp,
          errorCode: 'PAYMENT_NOT_FOUND'
        };
      }
      const text = resp.payload?.mensaje || resp.payload?.observacion || 'La tasa se encuentra pagada';
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
          hasPayment: true,
          pagoData: pagoTasa,
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

  /* API Services */
  private async updateReservationByRP(reserva: ReservaPeriodo, updates: any): Promise<ReservaPeriodo> {
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

  private getCategories() {
    this.categoriesService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.categoryList = data.payload;
        }
      },
      error: (error) => {
        this.handleError(error, 'Error al obtener las Categorías');
      }
    });
  }
  private loadEscuelas() {
    this.organizacionesService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data['status'] === 'OK') {
          this.escuelasList = data.payload.content || data.payload;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading organizations:', error);
        Swal.fire({ text: 'Error al obtener las organizaciones', icon: 'error', confirmButtonColor: '#299cdb' });
      }
    });
  }
  private loadEstudiantes() {
    this.estuduanteService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.estudiantesList = data.payload.content || data.payload;
        }
      },
      error: (error) => {
        Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
      }
    });
  }

  /* NOTIFICATIONS */
  private notifyAboutExpiredReservations(originalList: ReservaPeriodo[], updatedList: ReservaPeriodo[]): void {
    const newlyExpired = updatedList.filter(item => {
      const originalItem = originalList.find(original =>
        original.reservaDto?.uuid === item.reservaDto?.uuid
      );
      return originalItem?.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE &&
            item.reservaDto?.estadoReserva === EstadoReserva.EXPIRADA;
    });
    if (newlyExpired.length > 0) {
      const expiredCount = newlyExpired.length;
      const message = expiredCount === 1
        ? '1 reserva ha expirado por falta de pago y ha sido cancelada automáticamente'
        : `${expiredCount} reservas han expirado por falta de pago y han sido canceladas automáticamente`;

      Swal.fire({
        title: 'Reservas Expiradas',
        html: `
          <p>${message}</p>
          <p class="text-sm text-muted mt-2">
            <i class="fas fa-info-circle me-1"></i>
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
